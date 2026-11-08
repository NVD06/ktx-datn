import { prisma } from '../../config/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthUser } from '../../types/auth-user.js';
import { paginate } from '../../utils/paginate.js';
import { buildingScope, outOfScope } from '../../utils/scope.js';
import { findBuildingInScope } from '../rooms/room.service.js';
import type { AnnouncementInput, AnnouncementListQuery } from './announcement.schema.js';

/*
 * Bảng tin của ban quản lý: Admin đăng cho toàn KTX hoặc một tòa, Manager đăng cho tòa mình và
 * chỉ sửa / xóa tin của tòa mình. SV đọc tin toàn KTX và tin của tòa đang ở, đánh dấu đã đọc.
 */

const INCLUDE = {
  building: { select: { id: true, name: true } },
  author: { select: { id: true, fullName: true } },
} as const satisfies Prisma.AnnouncementInclude;

function visibleTo(user: AuthUser): Prisma.AnnouncementWhereInput {
  const { buildingId } = buildingScope(user);
  return buildingId ? { OR: [{ buildingId: null }, { buildingId }] } : {};
}

async function targetBuilding(user: AuthUser, buildingId: string | null) {
  if (user.role === 'MANAGER') return buildingScope(user).buildingId!;
  if (buildingId) await findBuildingInScope(user, buildingId);
  return buildingId;
}

export function list(user: AuthUser, query: AnnouncementListQuery) {
  const where: Prisma.AnnouncementWhereInput = {
    AND: [visibleTo(user), query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}],
  };
  return paginate(
    query,
    { sortable: ['createdAt', 'title'], defaultSort: { field: 'createdAt', order: 'desc' } },
    (page) => prisma.announcement.findMany({ where, ...page, include: INCLUDE }),
    () => prisma.announcement.count({ where }),
  );
}

export async function create(user: AuthUser, input: AnnouncementInput) {
  const buildingId = await targetBuilding(user, input.buildingId);
  return prisma.announcement.create({ data: { ...input, buildingId, authorId: user.id }, include: INCLUDE });
}

export async function update(user: AuthUser, id: string, input: AnnouncementInput) {
  const buildingId = await targetBuilding(user, input.buildingId);
  const { count } = await prisma.announcement.updateMany({
    where: { id, ...buildingScope(user) },
    data: { ...input, buildingId },
  });
  if (count === 0) throw outOfScope(user, 'Không tìm thấy thông báo');
  return prisma.announcement.findUniqueOrThrow({ where: { id }, include: INCLUDE });
}

export async function remove(user: AuthUser, id: string) {
  const { count } = await prisma.announcement.deleteMany({ where: { id, ...buildingScope(user) } });
  if (count === 0) throw outOfScope(user, 'Không tìm thấy thông báo');
  return { id };
}

async function studentScope(user: AuthUser): Promise<Prisma.AnnouncementWhereInput> {
  const contract = await prisma.contract.findFirst({
    where: { status: 'ACTIVE', startDate: { lte: new Date() }, registration: { studentId: user.id } },
    orderBy: { startDate: 'desc' },
    select: { bed: { select: { room: { select: { buildingId: true } } } } },
  });
  return contract ? { OR: [{ buildingId: null }, { buildingId: contract.bed.room.buildingId }] } : { buildingId: null };
}

export async function listMine(user: AuthUser) {
  const announcements = await prisma.announcement.findMany({
    where: await studentScope(user),
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    take: 100,
    include: { ...INCLUDE, reads: { where: { userId: user.id }, select: { readAt: true } } },
  });
  return announcements.map(({ reads, ...a }) => ({ ...a, readAt: reads[0]?.readAt ?? null }));
}

export async function markRead(user: AuthUser, id: string) {
  const announcement = await prisma.announcement.findFirst({
    where: { AND: [{ id }, await studentScope(user)] },
    select: { id: true },
  });
  if (!announcement) throw outOfScope(user, 'Không tìm thấy thông báo');
  await prisma.announcementRead.createMany({ data: [{ announcementId: id, userId: user.id }], skipDuplicates: true });
  return { id };
}
