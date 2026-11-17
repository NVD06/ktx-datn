import { beforeEach, describe, expect, it } from 'vitest';
import { list, reject } from '../src/modules/registrations/registration.service.js';
import { registrationListQuerySchema } from '../src/modules/registrations/registration.schema.js';
import type { AuthUser } from '../src/types/auth-user.js';
import {
  createAdmin,
  createBuilding,
  createManager,
  createPeriod,
  createRegistration,
  createStudent,
} from './factory.js';

/*
 * Manager thấy đơn chọn tòa mình + đơn "tòa nào cũng được" cùng giới tính với tòa,
 * không thấy đơn đã chọn tòa khác — kể cả khi tìm đúng tên SV đó.
 */
describe('Phạm vi đơn đăng ký của Manager (US-02.4)', () => {
  let admin: AuthUser;
  let male: AuthUser; // quản lý tòa nam
  let female: AuthUser; // quản lý tòa nữ
  let male2: AuthUser; // quản lý tòa nam thứ hai
  const reg = {} as Record<'anMale' | 'binhAny' | 'cucAny' | 'emMale2', string>;

  beforeEach(async () => {
    const [bMale, bFemale, bMale2] = [
      await createBuilding('MALE'),
      await createBuilding('FEMALE'),
      await createBuilding('MALE'),
    ];
    [admin, male, female, male2] = [
      await createAdmin(),
      await createManager(bMale.id),
      await createManager(bFemale.id),
      await createManager(bMale2.id),
    ];
    const { id: periodId } = await createPeriod();

    const add = async (name: string, gender: 'MALE' | 'FEMALE', buildingId: string | null) =>
      (await createRegistration(await createStudent(gender, name), periodId, buildingId)).id;
    reg.anMale = await add('Nguyễn Văn An', 'MALE', bMale.id);
    reg.binhAny = await add('Trần Bình', 'MALE', null);
    reg.cucAny = await add('Ngô Thu Cúc', 'FEMALE', null);
    // Nam, chọn tòa nam thứ hai: cùng giới tính với tòa nam đầu nhưng đã chọn tòa khác.
    reg.emMale2 = await add('Hoàng Văn Em', 'MALE', bMale2.id);
  });

  async function visible(user: AuthUser, search?: string) {
    const { data } = await list(user, registrationListQuerySchema.parse({ search }));
    return data.map((r) => r.id).sort();
  }
  const ids = (...keys: (keyof typeof reg)[]) => keys.map((k) => reg[k]).sort();

  it('tòa nam: đơn chọn tòa mình + đơn "tòa nào cũng được" của SV nam', async () => {
    expect(await visible(male)).toEqual(ids('anMale', 'binhAny'));
  });

  it('tòa nữ: chỉ đơn "tòa nào cũng được" của SV nữ', async () => {
    expect(await visible(female)).toEqual(ids('cucAny'));
  });

  it('tòa nam thứ hai: đơn chọn tòa mình + đơn "tòa nào cũng được" của SV nam', async () => {
    expect(await visible(male2)).toEqual(ids('binhAny', 'emMale2'));
  });

  it('Admin thấy tất cả', async () => {
    expect(await visible(admin)).toEqual(ids('anMale', 'binhAny', 'cucAny', 'emMale2'));
  });

  it('tìm đúng tên SV đã chọn tòa khác vẫn không ra', async () => {
    expect(await visible(male, 'Nguyễn Văn An')).toEqual(ids('anMale'));
    expect(await visible(male, 'Hoàng Văn Em')).toEqual([]);
    expect(await visible(female, 'Nguyễn Văn An')).toEqual([]);
  });

  it('không từ chối được đơn ngoài phạm vi (403)', async () => {
    await expect(reject(male, reg.emMale2, { reviewNote: 'Không phù hợp' })).rejects.toMatchObject({ status: 403 });
  });
});
