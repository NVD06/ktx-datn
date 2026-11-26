import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma.js';
import { sign } from '../src/modules/contracts/contract.service.js';
import { approve } from '../src/modules/registrations/registration.service.js';
import type { AuthUser } from '../src/types/auth-user.js';
import { createBuilding, createManager, createPeriod, createRegistration, createRoom, createStudent } from './factory.js';
describe('Sinh viên ký hợp đồng — nhánh không ký được', () => {
  let student: AuthUser;
  let bedId: string;
  let contractId: string;
  beforeEach(async () => {
    const buildingId = (await createBuilding('MALE')).id;
    const manager = await createManager(buildingId);
    const periodId = (await createPeriod()).id;
    bedId = (await createRoom(buildingId, 1)).beds[0]!.id;
    student = await createStudent('MALE');
    const registrationId = (await createRegistration(student, periodId, buildingId)).id;
    await approve(manager, registrationId, { bedId });
    contractId = (await prisma.contract.findFirstOrThrow({ where: { registrationId } })).id;
  });
  const unchanged = async (bedStatus: string) => {
    expect(await prisma.contract.findUniqueOrThrow({ where: { id: contractId } })).toMatchObject({ status: 'DRAFT', signedAt: null });
    expect((await prisma.bed.findUniqueOrThrow({ where: { id: bedId } })).status).toBe(bedStatus);
    expect(await prisma.invoice.count({ where: { contractId } })).toBe(0);
  };
  it('hợp đồng quá hạn thì báo CONTRACT_EXPIRED, không đổi gì', async () => {
    await prisma.contract.update({ where: { id: contractId }, data: { endDate: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
    await expect(sign(student, contractId)).rejects.toMatchObject({ status: 409, code: 'CONTRACT_EXPIRED' });
    await unchanged('AVAILABLE');
  });
  it('giường đang bảo trì thì báo BED_UNAVAILABLE, hợp đồng vẫn chờ ký', async () => {
    await prisma.bed.update({ where: { id: bedId }, data: { status: 'MAINTENANCE' } });
    await expect(sign(student, contractId)).rejects.toMatchObject({ status: 409, code: 'BED_UNAVAILABLE' });
    await unchanged('MAINTENANCE');
  });
});
