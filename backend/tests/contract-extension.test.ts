import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma.js';
import { extend, getById, rejectExtension, requestExtension, terminate } from '../src/modules/contracts/contract.service.js';
import { extendContractSchema } from '../src/modules/contracts/contract.schema.js';
import type { AuthUser } from '../src/types/auth-user.js';
import { createActiveContract, createBuilding, createManager, createRoom, createStudent } from './factory.js';
const DAY = 24 * 60 * 60 * 1000;
const dateInput = (d: Date) => d.toISOString().slice(0, 10);
const to = (d: string) => extendContractSchema.parse({ endDate: d });
describe('Sinh viên xin gia hạn hợp đồng', () => {
  let student: AuthUser;
  let other: AuthUser;
  let manager: AuthUser;
  let otherManager: AuthUser;
  let contractId: string;
  let endDate: Date;
  beforeEach(async () => {
    const buildingId = (await createBuilding('MALE')).id;
    const room = await createRoom(buildingId, 2);
    student = await createStudent('MALE');
    other = await createStudent('MALE');
    manager = await createManager(buildingId);
    otherManager = await createManager((await createBuilding('MALE')).id);
    const contract = await createActiveContract(student, room.beds[0]!);
    contractId = contract.id;
    endDate = contract.endDate;
  });
  it('gửi yêu cầu không đổi ngày kết thúc, quản lý duyệt bằng gia hạn thì yêu cầu được xóa', async () => {
    const wanted = dateInput(new Date(endDate.getTime() + 60 * DAY));
    const requested = await requestExtension(student, contractId, to(wanted));
    expect(requested.endDate).toEqual(endDate);
    expect(dateInput(requested.extensionRequestedTo!)).toBe(wanted);
    const pending = await prisma.contract.count({ where: { extensionRequestedTo: { not: null } } });
    expect(pending).toBe(1);
    const extended = await extend(manager, contractId, to(wanted));
    expect(dateInput(extended.endDate)).toBe(wanted);
    expect(extended.extensionRequestedTo).toBeNull();
  });
  it('từ chối lưu lý do; gửi lại thì xóa lý do cũ', async () => {
    const wanted = dateInput(new Date(endDate.getTime() + 30 * DAY));
    await requestExtension(student, contractId, to(wanted));
    const rejected = await rejectExtension(manager, contractId, { reason: 'Giường đã có người đăng ký' });
    expect(rejected.extensionRequestedTo).toBeNull();
    expect(rejected.extensionRejectReason).toBe('Giường đã có người đăng ký');
    await expect(rejectExtension(manager, contractId, { reason: 'x' })).rejects.toMatchObject({
      status: 409,
      code: 'NO_EXTENSION_REQUEST',
    });
    const again = await requestExtension(student, contractId, to(wanted));
    expect(again.extensionRejectReason).toBeNull();
    expect(again.extensionRequestedTo).not.toBeNull();
  });
  it('kiểm tra ngày như gia hạn và chặn ngoài phạm vi', async () => {
    await expect(requestExtension(student, contractId, to(dateInput(new Date(endDate.getTime() - DAY))))).rejects.toMatchObject({ status: 400 });
    const wanted = dateInput(new Date(endDate.getTime() + 30 * DAY));
    await expect(requestExtension(other, contractId, to(wanted))).rejects.toMatchObject({ status: 404 });
    await requestExtension(student, contractId, to(wanted));
    await expect(rejectExtension(otherManager, contractId, { reason: 'x' })).rejects.toMatchObject({ status: 403 });
  });
  it('chấm dứt hợp đồng thì xóa yêu cầu, không xin gia hạn được nữa', async () => {
    await requestExtension(student, contractId, to(dateInput(new Date(endDate.getTime() + 30 * DAY))));
    await terminate(manager, contractId, { reason: 'Trả phòng' });
    expect((await getById(manager, contractId)).extensionRequestedTo).toBeNull();
    await expect(
      requestExtension(student, contractId, to(dateInput(new Date(endDate.getTime() + 40 * DAY)))),
    ).rejects.toMatchObject({ status: 409, code: 'CONTRACT_NOT_ACTIVE' });
  });
});
