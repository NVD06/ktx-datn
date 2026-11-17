import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma.js';
import { announcementInputSchema } from '../src/modules/announcements/announcement.schema.js';
import { create, list, listMine, markRead, remove, update } from '../src/modules/announcements/announcement.service.js';
import type { AuthUser } from '../src/types/auth-user.js';
import {
  createActiveContract,
  createAdmin,
  createBuilding,
  createManager,
  createRoom,
  createStudent,
} from './factory.js';

const DAY = 24 * 60 * 60 * 1000;

describe('Thông báo', () => {
  let admin: AuthUser;
  let manager: AuthUser;
  let otherManager: AuthUser;
  let buildingId: string;
  let otherBuildingId: string;

  const input = (title: string, extra: Partial<{ buildingId: string | null; pinned: boolean }> = {}) =>
    announcementInputSchema.parse({ title, content: 'Nội dung', ...extra });

  beforeEach(async () => {
    buildingId = (await createBuilding('MALE')).id;
    otherBuildingId = (await createBuilding('MALE')).id;
    admin = await createAdmin();
    manager = await createManager(buildingId);
    otherManager = await createManager(otherBuildingId);
  });

  it('Manager luôn đăng cho tòa mình, chỉ sửa / xóa tin của tòa mình', async () => {
    const own = await create(manager, input('Cắt nước', { buildingId: null }));
    expect(own.buildingId).toBe(buildingId);
    const global = await create(admin, input('Lịch nghỉ lễ'));
    expect(global.buildingId).toBeNull();
    await create(admin, input('Tòa khác', { buildingId: otherBuildingId }));

    expect((await list(manager, {})).data.map((a) => a.title).sort()).toEqual(['Cắt nước', 'Lịch nghỉ lễ']);
    expect((await list(admin, {})).meta.total).toBe(3);

    await expect(update(manager, global.id, input('Sửa'))).rejects.toMatchObject({ status: 403 });
    await expect(remove(otherManager, own.id)).rejects.toMatchObject({ status: 403 });
    expect((await update(manager, own.id, input('Cắt nước sáng mai', { pinned: true }))).pinned).toBe(true);
    await remove(admin, own.id);
    expect(await prisma.announcement.count()).toBe(2);
  });

  it('SV thấy tin toàn KTX và tòa đang ở, tin ghim trước, đánh dấu đã đọc', async () => {
    const student = await createStudent('MALE');
    const room = await createRoom(buildingId, 1);
    await createActiveContract(student, room.beds[0]!, { startDate: new Date(Date.now() - DAY) });
    const global = await create(admin, input('Toàn KTX'));
    await create(manager, input('Tòa mình', { pinned: true }));
    const foreign = await create(otherManager, input('Tòa khác'));

    expect((await listMine(student)).map((a) => [a.title, a.readAt])).toEqual([
      ['Tòa mình', null],
      ['Toàn KTX', null],
    ]);
    await markRead(student, global.id);
    await markRead(student, global.id);
    expect((await listMine(student)).find((a) => a.id === global.id)?.readAt).toBeInstanceOf(Date);
    await expect(markRead(student, foreign.id)).rejects.toMatchObject({ status: 404 });

    const outsider = await createStudent('MALE');
    expect((await listMine(outsider)).map((a) => a.title)).toEqual(['Toàn KTX']);
  });

});
