import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma.js';
import { cancel } from '../src/modules/contracts/contract.service.js';
import { approve } from '../src/modules/registrations/registration.service.js';
import type { AuthUser } from '../src/types/auth-user.js';
import { createActiveContract, createBuilding, createManager, createPeriod, createRegistration, createRoom, createStudent } from './factory.js';
describe('Quản lý hủy hợp đồng chờ ký', () => {
  let manager: AuthUser;
  let periodId: string;
  let bedId: string;
  let registrationId: string;
  let contractId: string;
  beforeEach(async () => {
    const buildingId = (await createBuilding('MALE')).id;
    manager = await createManager(buildingId);
    periodId = (await createPeriod()).id;
    bedId = (await createRoom(buildingId, 1)).beds[0]!.id;
    registrationId = (await createRegistration(await createStudent('MALE'), periodId, buildingId)).id;
    await approve(manager, registrationId, { bedId });
    contractId = (await prisma.contract.findFirstOrThrow({ where: { registrationId } })).id;
  });
  it('hợp đồng chuyển CANCELLED, đơn ghi lý do, giường xếp được cho sinh viên khác', async () => {
    const cancelled = await cancel(manager, contractId, { reason: 'Sinh viên không đến ký' });
    expect(cancelled).toMatchObject({ status: 'CANCELLED', terminationReason: 'Sinh viên không đến ký' });
    const registration = await prisma.registration.findUniqueOrThrow({ where: { id: registrationId } });
    expect(registration).toMatchObject({ status: 'CANCELLED', reviewNote: 'Sinh viên không đến ký' });
    const next = await createRegistration(await createStudent('MALE'), periodId, null);
    await approve(manager, next.id, { bedId });
    expect(await prisma.contract.count({ where: { bedId, status: 'DRAFT' } })).toBe(1);
  });
  it('không hủy được hợp đồng đã hủy, đang ở hoặc của tòa khác', async () => {
    const otherManager = await createManager((await createBuilding('MALE')).id);
    await expect(cancel(otherManager, contractId, { reason: 'x' })).rejects.toMatchObject({ status: 403 });
    await cancel(manager, contractId, { reason: 'x' });
    await expect(cancel(manager, contractId, { reason: 'x' })).rejects.toMatchObject({ status: 409 });
    const room = await createRoom((await prisma.user.findUniqueOrThrow({ where: { id: manager.id } })).buildingId!, 1);
    const active = await createActiveContract(await createStudent('MALE'), room.beds[0]!);
    await expect(cancel(manager, active.id, { reason: 'x' })).rejects.toMatchObject({ status: 409 });
    expect((await prisma.contract.findUniqueOrThrow({ where: { id: active.id } })).status).toBe('ACTIVE');
  });
});
