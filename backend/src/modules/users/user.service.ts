import { randomUUID } from 'node:crypto';
import { prisma } from '../../config/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../../types/auth-user.js';
import { ApiError } from '../../utils/api-error.js';
import { paginate } from '../../utils/paginate.js';
import { hashPassword } from '../auth/auth.service.js';
import type {
  CreateManagerInput,
  ImportStudentsInput,
  StudentAccountInput,
  UpdateUserInput,
  UserListQuery,
} from './user.schema.js';

// Liệt kê tường minh từng cột: `passwordHash` không bao giờ được rời khỏi service.
const SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  buildingId: true,
  building: { select: { id: true, name: true } },
  profile: { select: { studentCode: true } },
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.UserSelect;

export async function list(query: UserListQuery) {
  const where: Prisma.UserWhereInput = {
    AND: [
      query.role ? { role: query.role } : {},
      query.buildingId ? { buildingId: query.buildingId } : {},
      query.isActive !== undefined ? { isActive: query.isActive } : {},
      query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { profile: { studentCode: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {},
    ],
  };

  return paginate(
    query,
    { sortable: ['fullName', 'email', 'createdAt'] },
    (page) => prisma.user.findMany({ where, ...page, select: SELECT }),
    () => prisma.user.count({ where }),
  );
}

/**
 * Tòa gán được cho quản lý `userId` (null khi tạo mới): tồn tại, đang hoạt động và
 * chưa có quản lý khác. Manager ↔ tòa là quan hệ 1–1 — tòa đã có người thì phải
 * gỡ người cũ trước, không tự thay thế sau lưng Admin. Hai Admin cùng gán vào một
 * tòa trống thì unique index User.buildingId chặn người ghi sau (error-handler trả 409).
 */
async function assertBuildingAssignable(buildingId: string, userId: string | null) {
  const building = await prisma.building.findUnique({
    where: { id: buildingId },
    select: { name: true, isActive: true, manager: { select: { id: true, fullName: true } } },
  });
  if (!building) {
    const message = 'Tòa nhà không tồn tại';
    throw ApiError.badRequest('BUILDING_NOT_FOUND', message, { buildingId: [message] });
  }
  if (!building.isActive) {
    throw ApiError.conflict(
      'BUILDING_INACTIVE',
      `Tòa nhà ${building.name} đang ngừng hoạt động, không thể gán quản lý`,
    );
  }
  // Gán lại đúng người đang quản lý thì không có gì thay đổi — cho qua.
  if (building.manager && building.manager.id !== userId) {
    throw ApiError.conflict(
      'BUILDING_HAS_MANAGER',
      `Tòa nhà ${building.name} đang do ${building.manager.fullName} quản lý. Hãy gỡ người này khỏi tòa trước khi gán người khác.`,
    );
  }
}

/**
 * Admin tạo tài khoản quản lý (US-01.6). Vai trò luôn là MANAGER, không nhận từ
 * client; không có đường tạo thêm ADMIN qua API (Admin đầu tiên: lệnh create-admin).
 */
export async function createManager({ password, ...input }: CreateManagerInput) {
  const taken = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (taken) throw ApiError.conflict('EMAIL_TAKEN', 'Email này đã được dùng cho tài khoản khác');
  if (input.buildingId) await assertBuildingAssignable(input.buildingId, null);

  return prisma.user.create({
    data: { ...input, passwordHash: await hashPassword(password), role: 'MANAGER' },
    select: SELECT,
  });
}

// ── Tài khoản sinh viên ─────────────────────────────────────────────────────
// Không còn tự đăng ký: Admin cấp tài khoản, mật khẩu ban đầu là mã SV và
// `mustChangePassword` bắt đổi ở lần đăng nhập đầu (middlewares/auth.ts chặn tới khi đổi).

function studentUser(row: StudentAccountInput, passwordHash: string) {
  return {
    email: row.email,
    fullName: row.fullName,
    phone: row.phone ?? null,
    passwordHash,
    role: 'STUDENT' as const,
    mustChangePassword: true,
  };
}

function studentProfile(row: StudentAccountInput) {
  return {
    studentCode: row.studentCode,
    gender: row.gender,
    className: row.className ?? null,
    faculty: row.faculty ?? null,
  };
}

/** Admin tạo một tài khoản sinh viên. Email hoặc mã SV đã có tài khoản -> 409, lỗi gắn đúng ô. */
export async function createStudent(row: StudentAccountInput) {
  const [emailTaken, codeTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email: row.email }, select: { id: true } }),
    prisma.studentProfile.findUnique({ where: { studentCode: row.studentCode }, select: { id: true } }),
  ]);
  const details: Record<string, string[]> = {};
  if (emailTaken) details.email = ['Email này đã được dùng cho tài khoản khác'];
  if (codeTaken) details.studentCode = ['Mã sinh viên này đã có tài khoản'];
  if (emailTaken || codeTaken) throw new ApiError(409, 'ACCOUNT_EXISTS', 'Sinh viên này đã có tài khoản', details);

  return prisma.user.create({
    data: { ...studentUser(row, await hashPassword(row.studentCode)), profile: { create: studentProfile(row) } },
    select: SELECT,
  });
}

/**
 * Nhập danh sách sinh viên từ file Excel — tất cả hoặc không: còn dòng lỗi thì không tạo
 * tài khoản nào, trả 400 với lỗi theo `rows.<vị trí>.<trường>` để giao diện chỉ đúng dòng.
 * Dòng đã có đúng tài khoản đó (cùng email, cùng mã SV) thì bỏ qua, nên nhập lại file đã
 * sửa hoặc file có thêm người mới không bị báo trùng. `dryRun` chỉ kiểm tra, không ghi.
 */
export async function importStudents({ rows, dryRun = false }: ImportStudentsInput) {
  const details: Record<string, string[]> = {};
  const fail = (i: number, field: 'studentCode' | 'email', message: string) =>
    (details[`rows.${i}.${field}`] ??= []).push(message);

  // Trùng ngay trong file: báo ở mọi dòng trùng để Admin thấy đủ các dòng cần xem lại.
  for (const field of ['studentCode', 'email'] as const) {
    const count = new Map<string, number>();
    for (const row of rows) count.set(row[field], (count.get(row[field]) ?? 0) + 1);
    const label = field === 'email' ? 'Email' : 'Mã sinh viên';
    rows.forEach((row, i) => {
      if (count.get(row[field])! > 1) fail(i, field, `${label} xuất hiện nhiều lần trong file`);
    });
  }

  const [byEmail, byCode] = await Promise.all([
    prisma.user.findMany({
      where: { email: { in: rows.map((r) => r.email) } },
      select: { email: true, profile: { select: { studentCode: true } } },
    }),
    prisma.studentProfile.findMany({
      where: { studentCode: { in: rows.map((r) => r.studentCode) } },
      select: { studentCode: true, user: { select: { email: true } } },
    }),
  ]);
  const codeOfEmail = new Map(byEmail.map((u) => [u.email, u.profile?.studentCode ?? null]));
  const emailOfCode = new Map(byCode.map((p) => [p.studentCode, p.user.email]));

  const fresh: StudentAccountInput[] = [];
  let skipped = 0;
  rows.forEach((row, i) => {
    if (codeOfEmail.get(row.email) === row.studentCode) {
      skipped++;
      return;
    }
    if (codeOfEmail.has(row.email)) fail(i, 'email', 'Email đã được dùng cho tài khoản khác');
    const owner = emailOfCode.get(row.studentCode);
    if (owner) fail(i, 'studentCode', `Mã sinh viên đã có tài khoản với email ${owner}`);
    fresh.push(row);
  });
  if (Object.keys(details).length > 0) throw ApiError.validation(details);
  if (dryRun || fresh.length === 0) return { dryRun, created: fresh.length, skipped };

  // bcrypt băm trên thread pool của Node — băm song song nhanh hơn lần lượt từng người.
  const accounts = await Promise.all(
    fresh.map(async (row) => ({ id: randomUUID(), row, passwordHash: await hashPassword(row.studentCode) })),
  );
  await prisma.$transaction([
    prisma.user.createMany({ data: accounts.map(({ id, row, passwordHash }) => ({ id, ...studentUser(row, passwordHash) })) }),
    prisma.studentProfile.createMany({ data: accounts.map(({ id, row }) => ({ userId: id, ...studentProfile(row) })) }),
  ]);
  return { dryRun, created: accounts.length, skipped };
}

/** Sinh viên quên mật khẩu: Admin đặt lại về mã SV, sinh viên phải đổi ở lần đăng nhập kế tiếp. */
export async function resetStudentPassword(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { profile: { select: { studentCode: true } } } });
  if (!user) throw ApiError.notFound('Không tìm thấy người dùng');
  if (!user.profile) {
    throw ApiError.conflict('USER_NOT_STUDENT', 'Chỉ đặt lại được mật khẩu của tài khoản sinh viên');
  }
  return prisma.user.update({
    where: { id },
    data: {
      passwordHash: await hashPassword(user.profile.studentCode),
      mustChangePassword: true,
      passwordChangedAt: new Date(),
    },
    select: SELECT,
  });
}

/**
 * Admin gán/gỡ tòa cho quản lý (US-01) và khóa/mở khóa tài khoản (US-01.6). Khóa
 * có hiệu lực ngay từ request kế tiếp: requireAuth đọc `isActive` từ DB mỗi request.
 */
export async function update(actor: AuthUser, id: string, input: UpdateUserInput) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true, isActive: true, fullName: true },
  });
  if (!user) throw ApiError.notFound('Không tìm thấy người dùng');

  if (input.isActive === false && id === actor.id) {
    throw ApiError.conflict('CANNOT_LOCK_SELF', 'Bạn không thể tự khóa tài khoản của chính mình');
  }

  if (input.buildingId !== undefined) {
    if (user.role !== 'MANAGER') {
      throw ApiError.conflict('USER_NOT_MANAGER', 'Chỉ tài khoản quản lý mới được gán tòa nhà');
    }
    // Gỡ (null) thì vẫn cho, để dọn tòa của tài khoản đã khóa.
    if (input.buildingId !== null) {
      if (!(input.isActive ?? user.isActive)) {
        throw ApiError.conflict(
          'USER_INACTIVE',
          `Tài khoản ${user.fullName} đang bị khóa, không thể gán vào tòa nhà`,
        );
      }
      await assertBuildingAssignable(input.buildingId, id);
    }
  }

  return prisma.user.update({ where: { id }, data: input, select: SELECT });
}

/**
 * Xóa hẳn một tài khoản — chỉ tài khoản chưa có lịch sử nghiệp vụ, ví dụ cấp nhầm hoặc nhập
 * Excel sai. Đã có đơn đăng ký (kéo theo hợp đồng, hóa đơn, thanh toán), yêu cầu sửa chữa, hay
 * từng duyệt đơn / chấm dứt hợp đồng / xử lý sửa chữa / chấm vệ sinh / lập hóa đơn thì không xóa để giữ lịch
 * sử — khóa tài khoản thay vì xóa. Hồ sơ sinh viên xóa theo (onDelete: Cascade); quản lý đang
 * gán tòa thì tòa trống quản lý (khóa nằm ở User.buildingId).
 */
export async function remove(actor: AuthUser, id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      role: true,
      fullName: true,
      _count: { select: { registrations: true, requests: true, endedContracts: true, createdInvoices: true, announcements: true } },
    },
  });
  if (!user) throw ApiError.notFound('Không tìm thấy người dùng');
  if (id === actor.id) throw ApiError.conflict('CANNOT_DELETE_SELF', 'Bạn không thể tự xóa tài khoản của chính mình');
  if (user.role === 'ADMIN') {
    throw ApiError.conflict('CANNOT_DELETE_ADMIN', 'Không xóa tài khoản quản trị viên');
  }

  // Các cột chỉ lưu id người làm (không có khóa ngoại) — đếm tay.
  const [reviewed, handled, checked] = await Promise.all([
    prisma.registration.count({ where: { reviewedById: id } }),
    prisma.maintenanceRequest.count({ where: { handledById: id } }),
    prisma.hygieneRecord.count({ where: { checkedById: id } }),
  ]);
  const history = [
    user._count.registrations > 0 && 'đơn đăng ký ở',
    user._count.requests > 0 && 'yêu cầu sửa chữa',
    reviewed > 0 && 'đơn đã duyệt',
    user._count.endedContracts > 0 && 'hợp đồng đã chấm dứt',
    handled > 0 && 'yêu cầu sửa chữa đã xử lý',
    checked > 0 && 'lượt chấm vệ sinh',
    user._count.createdInvoices > 0 && 'hóa đơn đã lập',
    user._count.announcements > 0 && 'thông báo đã đăng',
  ].filter(Boolean);
  if (history.length > 0) {
    const message =
      `Tài khoản ${user.fullName} đã có ${history.join(', ')} — không xóa để giữ lịch sử. ` +
      'Hãy khóa tài khoản thay vì xóa.';
    throw ApiError.conflict('USER_HAS_HISTORY', message);
  }

  // Lọt qua bước kiểm tra (vừa có đơn mới) thì khóa ngoại chặn — error-handler trả 409.
  await prisma.user.delete({ where: { id } });
  return { id };
}
