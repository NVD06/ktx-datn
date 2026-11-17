import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma.js';
import { remove as removeBed } from '../src/modules/beds/bed.service.js';
import { remove as removeRoom } from '../src/modules/rooms/room.service.js';
import type { AuthUser } from '../src/types/auth-user.js';
import { createActiveContract, createAdmin, createBuilding, createRoom, createStudent } from './factory.js';
describe('Không xóa cứng phòng, giường đã được tham chiếu (BR-04)', () => {
  let admin: AuthUser;
  let buildingId: string;
  beforeEach(async () => {
    admin = await createAdmin();
    buildingId = (await createBuilding('MALE')).id;
  });
  it('phòng đã có hợp đồng thì từ chối, phòng chưa dùng thì xóa cả giường', async () => {
    const used = await createRoom(buildingId, 2);
    await createActiveContract(await createStudent('MALE'), used.beds[0]!);
    await expect(removeRoom(admin, used.id)).rejects.toMatchObject({ status: 409, code: 'ROOM_HAS_CONTRACTS' });
    expect(await prisma.bed.count({ where: { roomId: used.id } })).toBe(2);
    const empty = await createRoom(buildingId, 2);
    await removeRoom(admin, empty.id);
    expect(await prisma.room.count({ where: { id: empty.id } })).toBe(0);
    expect(await prisma.bed.count({ where: { roomId: empty.id } })).toBe(0);
  });
  it('giường đang có người hoặc có lịch sử hợp đồng thì từ chối, giường chưa dùng thì xóa được', async () => {
    const room = await createRoom(buildingId, 3);
    const [occupied, history, fresh] = room.beds;
    const contract = await createActiveContract(await createStudent('MALE'), occupied!);
    await prisma.bed.update({ where: { id: occupied!.id }, data: { status: 'OCCUPIED' } });
    await expect(removeBed(admin, occupied!.id)).rejects.toMatchObject({ status: 409, code: 'BED_OCCUPIED' });
    await prisma.contract.update({ where: { id: contract.id }, data: { bedId: history!.id, status: 'TERMINATED' } });
    await expect(removeBed(admin, history!.id)).rejects.toMatchObject({ status: 409, code: 'BED_HAS_CONTRACTS' });
    await removeBed(admin, fresh!.id);
    expect(await prisma.bed.count({ where: { roomId: room.id } })).toBe(2);
  });
});
