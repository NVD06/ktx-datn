import { beforeEach, describe, expect, it } from 'vitest';
import { confirm, create, list, listMine, stats, updateStatus } from '../src/modules/maintenance/maintenance.service.js';
import type { AuthUser } from '../src/types/auth-user.js';
import { createActiveContract, createAdmin, createBuilding, createManager, createRoom, createStudent } from './factory.js';

const DAY = 24 * 60 * 60 * 1000;
const input = { title: 'Vòi nước bị rỉ', description: 'Rỉ nước liên tục từ tối qua' };

describe('Yêu cầu sửa chữa (US-05.1 → US-05.3)', () => {
  let student: AuthUser;
  let manager: AuthUser;
  let otherManager: AuthUser;
  let roomId: string;

  beforeEach(async () => {
    const building = await createBuilding('MALE');
    const room = await createRoom(building.id, 2);
    roomId = room.id;
    manager = await createManager(building.id);
    otherManager = await createManager((await createBuilding('MALE')).id);
    student = await createStudent('MALE');
    await createActiveContract(student, room.beds[0]!, { startDate: new Date(Date.now() - 10 * DAY) });
  });

  it('phòng lấy từ hợp đồng đang ở, đi đủ chuỗi tới CONFIRMED kèm mốc thời gian', async () => {
    const request = await create(student, input);
    expect(request).toMatchObject({ roomId, status: 'PENDING', studentId: student.id });

    await updateStatus(manager, request.id, { status: 'RECEIVED' });
    const done = await updateStatus(manager, request.id, { status: 'DONE' });
    expect(done).toMatchObject({ status: 'DONE', handledById: manager.id });

    const confirmed = await confirm(student, request.id);
    expect(confirmed.status).toBe('CONFIRMED');
    for (const stamp of ['receivedAt', 'doneAt', 'confirmedAt'] as const) {
      expect(confirmed[stamp]).toBeInstanceOf(Date);
    }
    expect(confirmed.rejectedAt).toBeNull();
  });

  it('chặn nhảy cóc PENDING → DONE và bước lùi, trạng thái giữ nguyên', async () => {
    const request = await create(student, input);
    await expect(updateStatus(manager, request.id, { status: 'DONE' })).rejects.toMatchObject({
      status: 409,
      code: 'INVALID_STATUS_TRANSITION',
    });
    await expect(confirm(student, request.id)).rejects.toMatchObject({ status: 409 });

    await updateStatus(manager, request.id, { status: 'RECEIVED' });
    await expect(updateStatus(manager, request.id, { status: 'RECEIVED' })).rejects.toMatchObject({ status: 409 });
    // Đã tiếp nhận thì không từ chối được nữa.
    await expect(
      updateStatus(manager, request.id, { status: 'REJECTED', assigneeNote: 'Không thuộc phạm vi' }),
    ).rejects.toMatchObject({ status: 409 });
    const [mine] = await listMine(student);
    expect(mine?.status).toBe('RECEIVED');
  });

  it('từ chối khi còn PENDING; SV không xác nhận được yêu cầu chưa sửa xong', async () => {
    const request = await create(student, input);
    await expect(confirm(student, request.id)).rejects.toMatchObject({ status: 409 });

    const rejected = await updateStatus(manager, request.id, { status: 'REJECTED', assigneeNote: 'Trùng yêu cầu' });
    expect(rejected).toMatchObject({ status: 'REJECTED', assigneeNote: 'Trùng yêu cầu' });
    expect(rejected.rejectedAt).toBeInstanceOf(Date);
  });

  it('Manager tòa khác không thấy, không xử lý được (403); SV khác không xác nhận được (404)', async () => {
    const request = await create(student, input);
    expect((await list(otherManager, {})).meta.total).toBe(0);
    await expect(updateStatus(otherManager, request.id, { status: 'RECEIVED' })).rejects.toMatchObject({ status: 403 });

    for (const status of ['RECEIVED', 'DONE'] as const) await updateStatus(manager, request.id, { status });
    const stranger = await createStudent('MALE');
    await expect(confirm(stranger, request.id)).rejects.toMatchObject({ status: 404 });
    expect((await list(manager, { status: 'PENDING' })).meta.total).toBe(0);
    expect((await list(await createAdmin(), { status: 'DONE' })).meta.total).toBe(1);
  });

  it('SV chưa ở phòng nào (chỉ có hợp đồng kỳ sau) thì không gửi được', async () => {
    const newcomer = await createStudent('MALE');
    const room = await createRoom((await createBuilding('MALE')).id, 1);
    await createActiveContract(newcomer, room.beds[0]!, {
      startDate: new Date(Date.now() + 10 * DAY),
      endDate: new Date(Date.now() + 100 * DAY),
    });
    await expect(create(newcomer, input)).rejects.toMatchObject({ status: 409, code: 'NO_ACTIVE_CONTRACT' });
  });

  it('hai Manager cùng bấm tiếp nhận: đúng một người thành công', async () => {
    const request = await create(student, input);
    const admin = await createAdmin();
    const results = await Promise.allSettled([
      updateStatus(manager, request.id, { status: 'RECEIVED' }),
      updateStatus(admin, request.id, { status: 'RECEIVED' }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  });

  it('lọc chưa xong / theo tòa và số liệu đầu trang theo phạm vi', async () => {
    const first = await create(student, input);
    await create(student, { ...input, title: 'Quạt trần kêu' });
    await updateStatus(manager, first.id, { status: 'RECEIVED' });
    await updateStatus(manager, first.id, { status: 'DONE' });
    const admin = await createAdmin();
    expect((await list(admin, { status: 'OPEN' })).meta.total).toBe(1);
    expect((await list(admin, { buildingId: otherManager.buildingId! })).meta.total).toBe(0);
    expect(await stats(manager, {})).toMatchObject({
      pending: 1,
      received: 0,
      done: 1,
      createdThisMonth: 2,
      finishedThisMonth: 1,
      groupBy: 'FLOOR',
    });
    const all = await stats(admin, {});
    expect(all.groupBy).toBe('BUILDING');
    expect(all.groups).toHaveLength(1);
    expect(all.groups[0]?.count).toBe(2);
    expect(all.avgHours).toBeGreaterThanOrEqual(0);
    expect(await stats(otherManager, {})).toMatchObject({ pending: 0, createdThisMonth: 0, groups: [], avgHours: null });
    await expect(stats(otherManager, { buildingId: manager.buildingId! })).rejects.toMatchObject({ status: 403 });
  });
});
