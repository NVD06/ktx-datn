import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma.js';
import { saveHygieneSchema, type SaveHygieneInput } from '../src/modules/hygiene/hygiene.schema.js';
import { list, listMine, marksByStudent, myMarks, remove, save, sheet } from '../src/modules/hygiene/hygiene.service.js';
import { list as listContracts } from '../src/modules/contracts/contract.service.js';
import { list as listRegistrations } from '../src/modules/registrations/registration.service.js';
import type { AuthUser } from '../src/types/auth-user.js';
import { startOfDayVN } from '../src/utils/date-vn.js';
import {
  createActiveContract,
  createAdmin,
  createBuilding,
  createManager,
  createPeriod,
  createRegistration,
  createRoom,
  createStudent,
} from './factory.js';

const DAY = 24 * 60 * 60 * 1000;
const at = (day: string) => new Date(`${day}T12:00:00+07:00`);

describe('Chấm điểm vệ sinh (US-05.4, US-05.5)', () => {
  let manager: AuthUser;
  let otherManager: AuthUser;
  let buildingId: string;
  let rooms: Awaited<ReturnType<typeof createRoom>>[];

  beforeEach(async () => {
    buildingId = (await createBuilding('MALE')).id;
    rooms = [await createRoom(buildingId, 2), await createRoom(buildingId, 2)];
    manager = await createManager(buildingId);
    otherManager = await createManager((await createBuilding('MALE')).id);
  });

  it('lưu cả đợt: điểm trừ là tổng các lỗi, chấm lại cùng ngày thì ghi đè', async () => {
    const today = new Date();
    const result = await save(manager, {
      buildingId,
      checkDate: today,
      records: [
        { roomId: rooms[0]!.id, violations: [] },
        { roomId: rooms[1]!.id, violations: ['TRASH', 'COOKING'] },
      ],
    });
    expect(result).toEqual({ roomCount: 2, warningCount: 0 });
    expect(await prisma.hygieneRecord.findFirst({ where: { roomId: rooms[1]!.id } })).toMatchObject({
      deduction: 15,
      note: 'Rác, Nấu ăn',
      violations: ['TRASH', 'COOKING'],
    });

    await save(manager, { buildingId, checkDate: today, records: [{ roomId: rooms[1]!.id, violations: ['MESSY'] }] });
    expect(await prisma.hygieneRecord.count()).toBe(2);
    const sheetRooms = (await sheet(manager, { buildingId, checkDate: today })).rooms;
    expect(sheetRooms.find((r) => r.id === rooms[1]!.id)?.record).toMatchObject({ deduction: 3 });
  });

  it('trừ dồn trong kỳ nửa tháng, sửa hoặc xóa đợt trước thì tính lại đợt sau, sang kỳ mới về 100', async () => {
    const roomId = rooms[0]!.id;
    const score = async (day: string) =>
      (await prisma.hygieneRecord.findFirst({ where: { roomId, checkDate: startOfDayVN(at(day)) } }))?.score;
    const check = (day: string, violations: SaveHygieneInput['records'][number]['violations']) =>
      save(manager, { buildingId, checkDate: at(day), records: [{ roomId, violations }] });

    await check('2026-10-05', ['COOKING', 'TRASH']);
    await check('2026-10-12', ['COOKING', 'DIRTY_WC', 'MESSY']);
    expect([await score('2026-10-05'), await score('2026-10-12')]).toEqual([85, 67]);
    const before = async (day: string) =>
      (await sheet(manager, { buildingId, checkDate: at(day) })).rooms.find((r) => r.id === roomId)?.scoreBefore;
    expect([await before('2026-10-12'), await before('2026-10-15'), await before('2026-10-16')]).toEqual([85, 67, 100]);

    await check('2026-10-05', ['ABSENT']);
    expect(await score('2026-10-12')).toBe(80);
    const first = await prisma.hygieneRecord.findFirstOrThrow({ where: { roomId, checkDate: startOfDayVN(at('2026-10-05')) } });
    await remove(manager, first.id);
    expect(await score('2026-10-12')).toBe(82);

    await check('2026-10-16', ['TRASH']);
    expect(await score('2026-10-16')).toBe(95);
  });

  it('lỗi lạ hoặc trùng lỗi không hợp lệ; phòng ngoài tòa (400), tòa khác (403), ngày sau hôm nay (400) không lưu gì', async () => {
    const input = (violations: string[]) => ({ buildingId, checkDate: '2026-10-01', records: [{ roomId: rooms[0]!.id, violations }] });
    expect(saveHygieneSchema.safeParse(input(['TRASH', 'MESSY'])).success).toBe(true);
    expect(saveHygieneSchema.safeParse(input(['TRASH', 'TRASH'])).success).toBe(false);
    expect(saveHygieneSchema.safeParse(input(['SMOKING'])).success).toBe(false);

    const foreignRoom = await createRoom((await createBuilding('MALE')).id, 1);
    const record = (roomId: string) => [{ roomId, violations: [] }];
    await expect(save(manager, { buildingId, checkDate: new Date(), records: record(foreignRoom.id) })).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      save(otherManager, { buildingId, checkDate: new Date(), records: record(rooms[0]!.id) }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      save(manager, { buildingId, checkDate: new Date(Date.now() + 2 * DAY), records: record(rooms[0]!.id) }),
    ).rejects.toMatchObject({ status: 400 });
    expect(await prisma.hygieneRecord.count()).toBe(0);
  });

  it('bảng điểm lọc dưới ngưỡng và theo tháng; Manager tòa khác không thấy, không xóa được', async () => {
    const all = ['TRASH', 'MESSY', 'DIRTY_WC', 'CORRIDOR', 'COOKING', 'ABSENT'] as const;
    const check = (day: string, records: SaveHygieneInput['records']) => save(manager, { buildingId, checkDate: at(day), records });
    await check('2026-10-01', [
      { roomId: rooms[0]!.id, violations: [...all] },
      { roomId: rooms[1]!.id, violations: [] },
    ]);
    expect(await check('2026-10-02', [{ roomId: rooms[0]!.id, violations: [...all] }])).toEqual({ roomCount: 1, warningCount: 1 });

    const below = await list(manager, { belowWarning: true });
    expect(below.data.map((r) => r.score)).toEqual([44]);
    expect((await list(manager, { month: '2026-10' })).meta.total).toBe(3);
    expect((await list(otherManager, {})).meta.total).toBe(0);

    await expect(remove(otherManager, below.data[0]!.id)).rejects.toMatchObject({ status: 403 });
    await remove(manager, below.data[0]!.id);
    expect(await prisma.hygieneRecord.count()).toBe(2);
  });

  it('bảng chấm đếm SV ở đúng ngày kiểm tra: SV đã trả phòng trước ngày đó không tính', async () => {
    const [stays, left] = [await createStudent('MALE'), await createStudent('MALE')];
    await createActiveContract(stays, rooms[0]!.beds[0]!, { startDate: new Date(Date.now() - 10 * DAY) });
    const ended = await createActiveContract(left, rooms[0]!.beds[1]!, { startDate: new Date(Date.now() - 10 * DAY) });
    await prisma.contract.update({
      where: { id: ended.id },
      data: { status: 'TERMINATED', terminatedAt: new Date(Date.now() - 3 * DAY) },
    });

    const residents = async (daysAgo: number) =>
      (await sheet(manager, { buildingId, checkDate: new Date(Date.now() - daysAgo * DAY) })).rooms.find(
        (r) => r.id === rooms[0]!.id,
      )?.residents;
    expect(await residents(5)).toBe(2);
    expect(await residents(0)).toBe(1);
  });

  it('SV chỉ thấy điểm phòng mình trong thời gian mình ở', async () => {
    const student = await createStudent('MALE');
    await createActiveContract(student, rooms[0]!.beds[0]!, { startDate: new Date(Date.now() - 5 * DAY) });

    const record = (daysAgo: number, roomId = rooms[0]!.id) =>
      prisma.hygieneRecord.create({
        data: { roomId, checkDate: startOfDayVN(new Date(Date.now() - daysAgo * DAY)), score: 80, checkedById: manager.id },
      });
    await record(20); // trước khi SV vào ở
    const mine = await record(2);
    await record(2, rooms[1]!.id); // phòng khác

    expect((await listMine(student)).map((r) => r.id)).toEqual([mine.id]);
  });

  it('mỗi kỳ nửa tháng dưới 60 điểm là một dấu trong hợp đồng, kỳ vào ở giữa chừng không tính; quá 5 dấu thì không ưu tiên', async () => {
    const student = await createStudent('MALE');
    const contract = await createActiveContract(student, rooms[0]!.beds[0]!, { startDate: at('2026-07-01') });
    const late = await createStudent('MALE');
    await createActiveContract(late, rooms[0]!.beds[1]!, { startDate: at('2026-07-05') });
    const record = (day: string, score: number, roomId = rooms[0]!.id) =>
      prisma.hygieneRecord.create({ data: { roomId, checkDate: startOfDayVN(at(day)), score, checkedById: manager.id } });
    await record('2026-06-20', 40);
    await record('2026-07-03', 55);
    await record('2026-07-10', 45);
    await record('2026-07-20', 70);
    await record('2026-08-02', 50, rooms[1]!.id);
    await record('2026-08-16', 59);
    expect(await myMarks(student)).toEqual({ marks: 2 });
    expect([...(await marksByStudent(undefined, true)).keys()]).toEqual([]);

    for (const day of ['2026-09-01', '2026-09-16', '2026-10-01', '2026-10-16']) await record(day, 30);
    expect([...(await marksByStudent(undefined, true))]).toEqual([[student.id, 6]]);
    expect((await marksByStudent([late.id])).get(late.id)).toBe(5);
    const admin = await createAdmin();
    await prisma.contract.update({ where: { id: contract.id }, data: { extensionRequestedTo: at('2027-06-30') } });
    expect((await listContracts(admin, { extension: 'PENDING', lowPriority: true })).data).toMatchObject([
      { id: contract.id, hygieneMarks: 6 },
    ]);
    const next = await createActiveContract(student, rooms[1]!.beds[0]!, { startDate: new Date(Date.now() + 30 * DAY) });
    expect(await myMarks(student)).toEqual({ marks: 6 });
    expect((await listContracts(admin, { lowPriority: true })).data.map((c) => c.id)).toEqual([contract.id]);
    expect((await listContracts(admin, {})).data.find((c) => c.id === next.id)?.hygieneMarks).toBe(0);
    const other = await createStudent('MALE');
    const period = await createPeriod();
    await Promise.all([createRegistration(student, period.id, null), createRegistration(other, period.id, null)]);
    const registrations = await listRegistrations(admin, { periodId: period.id });
    expect(registrations.data.map((r) => [r.studentId, r.hygieneMarks]).sort()).toEqual(
      [[student.id, 6], [other.id, 0]].sort(),
    );
    expect((await listRegistrations(admin, { periodId: period.id, lowPriority: true })).data.map((r) => r.studentId)).toEqual([
      student.id,
    ]);
  });
});
