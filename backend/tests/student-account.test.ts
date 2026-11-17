import bcrypt from 'bcrypt';
import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSessionFromRequest } from '../src/config/auth.js';
import { prisma } from '../src/config/prisma.js';
import { requireAuth, requireSession } from '../src/middlewares/auth.js';
import { changePassword } from '../src/modules/auth/auth.service.js';
import { createStudent, importStudents, resetStudentPassword } from '../src/modules/users/user.service.js';
import type { StudentAccountInput } from '../src/modules/users/user.schema.js';
import type { AuthUser } from '../src/types/auth-user.js';
import { createBuilding, createManager } from './factory.js';

// Phiên đăng nhập của Auth.js: test tự chọn người đang đăng nhập, phần còn lại của middleware chạy thật.
vi.mock('../src/config/auth.js', () => ({ getSessionFromRequest: vi.fn() }));

const row = (n: number, extra: Partial<StudentAccountInput> = {}): StudentAccountInput => ({
  studentCode: `2101000${n}`,
  fullName: `Sinh Viên ${n}`,
  email: `sv${n}@st.test.vn`,
  gender: 'MALE',
  ...extra,
});

const AUTH_USER = { id: true, fullName: true, email: true, role: true, buildingId: true, mustChangePassword: true } as const;
const accountOf = (email: string) => prisma.user.findUniqueOrThrow({ where: { email }, select: AUTH_USER });

describe('Tài khoản sinh viên do Admin cấp', () => {
  beforeEach(() => vi.mocked(getSessionFromRequest).mockReset());

  it('mật khẩu ban đầu là mã SV; chưa đổi thì chỉ gọi được /auth/me và đổi mật khẩu', async () => {
    const created = await createStudent(row(1, { className: 'CNTT1' }));
    expect(created).toMatchObject({ role: 'STUDENT', mustChangePassword: true, profile: { studentCode: '21010001' } });
    const { passwordHash } = await prisma.user.findUniqueOrThrow({ where: { id: created.id } });
    expect(await bcrypt.compare('21010001', passwordHash)).toBe(true);

    const login = () => vi.mocked(getSessionFromRequest).mockResolvedValue({ userId: created.id, loginAt: Date.now() });
    login();
    const next = vi.fn() as unknown as NextFunction;
    const call = (mw: typeof requireAuth) => mw({} as Request, {} as Response, next);

    await expect(call(requireAuth)).rejects.toMatchObject({ status: 403, code: 'PASSWORD_CHANGE_REQUIRED' });
    await call(requireSession);
    expect(next).toHaveBeenCalledTimes(1);

    await changePassword(await accountOf(created.email), { currentPassword: '21010001', newPassword: 'matkhau-moi' });
    login();
    await call(requireAuth);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('đổi mật khẩu: sai mật khẩu hiện tại, trùng mật khẩu cũ, hoặc dùng mã SV đều bị từ chối', async () => {
    const { email } = await createStudent(row(1));
    const me = await accountOf(email);
    const reject = (currentPassword: string, newPassword: string, field: string) =>
      expect(changePassword(me, { currentPassword, newPassword })).rejects.toMatchObject({
        status: 400,
        details: { [field]: [expect.any(String)] },
      });

    await reject('sai-mat-khau', 'matkhau-moi', 'currentPassword');
    await reject('21010001', '21010001', 'newPassword');
    await changePassword(me, { currentPassword: '21010001', newPassword: 'matkhau-moi' });
    await reject('matkhau-moi', '21010001', 'newPassword');
    expect(await accountOf(email)).toMatchObject({ mustChangePassword: false });
  });

  it('đổi hoặc đặt lại mật khẩu: phiên đăng nhập trước đó bị 401, đăng nhập lại thì dùng được', async () => {
    const { id, email } = await createStudent(row(1));
    const call = (loginAt: number) => {
      vi.mocked(getSessionFromRequest).mockResolvedValue({ userId: id, loginAt });
      return requireSession({} as Request, {} as Response, vi.fn() as unknown as NextFunction);
    };
    const firstLogin = Date.now() - 1;
    await call(firstLogin);
    await changePassword(await accountOf(email), { currentPassword: '21010001', newPassword: 'matkhau-moi' });
    await expect(call(firstLogin)).rejects.toMatchObject({ status: 401 });
    const secondLogin = Date.now();
    await call(secondLogin);
    await resetStudentPassword(id);
    await expect(call(secondLogin - 1)).rejects.toMatchObject({ status: 401 });
    await call(Date.now());
  });

  it('tạo lẻ: email hoặc mã SV đã có tài khoản -> 409, lỗi gắn đúng trường', async () => {
    await createStudent(row(1));

    await expect(createStudent(row(2, { email: 'sv1@st.test.vn' }))).rejects.toMatchObject({
      status: 409,
      details: { email: [expect.any(String)] },
    });
    await expect(createStudent(row(2, { studentCode: '21010001' }))).rejects.toMatchObject({
      status: 409,
      details: { studentCode: [expect.any(String)] },
    });
  });

  it('nhập Excel: dryRun không ghi gì; nhập thật tạo đủ tài khoản kèm hồ sơ, bắt đổi mật khẩu', async () => {
    const rows = [row(1), row(2, { gender: 'FEMALE', phone: '0912345678', faculty: 'CNTT' })];

    expect(await importStudents({ rows, dryRun: true })).toEqual({ dryRun: true, created: 2, skipped: 0 });
    expect(await prisma.user.count()).toBe(0);

    expect(await importStudents({ rows })).toEqual({ dryRun: false, created: 2, skipped: 0 });
    const users = await prisma.user.findMany({ include: { profile: true }, orderBy: { email: 'asc' } });
    expect(users.map((u) => [u.email, u.role, u.mustChangePassword, u.profile?.studentCode, u.profile?.gender])).toEqual([
      ['sv1@st.test.vn', 'STUDENT', true, '21010001', 'MALE'],
      ['sv2@st.test.vn', 'STUDENT', true, '21010002', 'FEMALE'],
    ]);
    expect(await bcrypt.compare('21010002', users[1]!.passwordHash)).toBe(true);
  });

  it('nhập Excel: còn dòng lỗi thì không tạo ai; dòng đã có đúng tài khoản đó thì bỏ qua', async () => {
    await createStudent(row(1));
    await createStudent(row(2));

    // Dòng 0 trùng mã SV với dòng 2; dòng 1 dùng email của SV2 (tài khoản khác); dòng 3 là SV1 đã có.
    const rows = [row(5), row(6, { email: 'sv2@st.test.vn' }), row(7, { studentCode: '21010005' }), row(1)];
    const error = await importStudents({ rows }).catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 400 });
    expect(Object.keys((error as { details: object }).details).sort()).toEqual([
      'rows.0.studentCode',
      'rows.1.email',
      'rows.2.studentCode',
    ]);
    expect(await prisma.user.count()).toBe(2);

    expect(await importStudents({ rows: [row(1), row(5)] })).toEqual({ dryRun: false, created: 1, skipped: 1 });
  });

  it('đặt lại mật khẩu: về mã SV và bắt đổi lại; tài khoản quản lý thì không đặt lại được', async () => {
    const { id, email } = await createStudent(row(1));
    await changePassword(await accountOf(email), { currentPassword: '21010001', newPassword: 'matkhau-moi' });

    expect(await resetStudentPassword(id)).toMatchObject({ mustChangePassword: true });
    const { passwordHash } = await prisma.user.findUniqueOrThrow({ where: { id } });
    expect(await bcrypt.compare('21010001', passwordHash)).toBe(true);

    const manager: AuthUser = await createManager((await createBuilding('MALE')).id);
    await expect(resetStudentPassword(manager.id)).rejects.toMatchObject({ status: 409, code: 'USER_NOT_STUDENT' });
  });
});
