import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma.js';
import type { Gender } from '../src/generated/prisma/enums.js';
import { approve } from '../src/modules/registrations/registration.service.js';
import { createBuilding, createManager, createPeriod, createRegistration, createRoom, createStudent } from './factory.js';

describe('Duyệt đơn và xếp giường (US-03.1, US-03.2)', () => {
  let periodId: string;

  beforeEach(async () => {
    periodId = (await createPeriod()).id;
  });

  /** Đơn chờ duyệt của một SV mới, nguyện vọng vào tòa `buildingId`. */
  async function pending(gender: Gender, buildingId: string) {
    return (await createRegistration(await createStudent(gender), periodId, buildingId)).id;
  }

  /**
   * Chạy các lệnh duyệt trong lúc test đang giữ khóa dòng phòng, 300ms sau mới nhả: các lệnh
   * kịp đi tới chỗ khóa phòng và cùng chờ ở đó, nên tranh chấp chắc chắn xảy ra thay vì tùy
   * may rủi. Service bỏ mất bước khóa phòng thì các lệnh chạy tuốt qua và test đỏ.
   */
  async function raceOnRoom<T>(roomId: string, run: () => Promise<T>) {
    // Mở sẵn kết nối trong pool: không thì lệnh thứ hai phải chờ mở kết nối mới, lệnh thứ
    // nhất chạy xong trước đó — hai lệnh thành ra lần lượt, không còn tranh chấp.
    await Promise.all([1, 2, 3, 4].map(() => prisma.$executeRaw`SELECT pg_sleep(0.05)`));
    const locked = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const holder = prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM "Room" WHERE id = ${roomId} FOR UPDATE`;
      locked.resolve();
      await release.promise;
    });
    await locked.promise;
    const result = run();
    await new Promise((resolve) => setTimeout(resolve, 300));
    release.resolve();
    await holder;
    return result;
  }

  it('2 lệnh duyệt song song vào cùng một giường → đúng một lệnh thành công, lệnh kia 409', async () => {
    const building = await createBuilding('MALE');
    const manager = await createManager(building.id);
    const room = await createRoom(building.id, 2);
    const bedId = room.beds[0]!.id;
    const [a, b] = [await pending('MALE', building.id), await pending('MALE', building.id)];

    const results = await raceOnRoom(room.id, () =>
      Promise.allSettled([approve(manager, a, { bedId }), approve(manager, b, { bedId })]),
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({ reason: { status: 409, code: 'BED_TAKEN' } });
    expect(await prisma.contract.count({ where: { bedId } })).toBe(1);
    // Lệnh thua rollback cả transaction — đơn đó vẫn chờ duyệt để Manager xếp giường khác.
    const rows = await prisma.registration.findMany({ where: { id: { in: [a, b] } }, select: { status: true } });
    expect(rows.map((r) => r.status).sort()).toEqual(['APPROVED', 'PENDING']);
  });

  it('tòa nam không xếp được sinh viên nữ, kể cả khi đơn đã ghi đích danh tòa đó', async () => {
    const building = await createBuilding('MALE');
    const manager = await createManager(building.id);
    const room = await createRoom(building.id, 2);
    // Dựng thẳng đơn — lúc nộp đơn, SV nữ đã bị chặn chọn tòa nam; đây là lớp chặn thứ hai khi duyệt.
    const female = await pending('FEMALE', building.id);

    await expect(approve(manager, female, { bedId: room.beds[0]!.id })).rejects.toMatchObject({
      status: 409,
      code: 'ROOM_GENDER_MISMATCH',
    });
    expect(await prisma.contract.count()).toBe(0);
  });
});
