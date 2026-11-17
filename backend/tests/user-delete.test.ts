import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/prisma.js';
import { createStudent as createStudentAccount, remove } from '../src/modules/users/user.service.js';
import type { AuthUser } from '../src/types/auth-user.js';
import { createAdmin, createBuilding, createManager, createPeriod, createRegistration, createStudent } from './factory.js';

describe('Xóa tài khoản', () => {
  let admin: AuthUser;

  beforeEach(async () => {
    admin = await createAdmin();
  });

  it('sinh viên chưa có lịch sử (cấp nhầm) thì xóa hẳn, hồ sơ xóa theo', async () => {
    const { id } = await createStudentAccount({ studentCode: '23010101', fullName: 'Cấp Nhầm', email: 'a@st.vn', gender: 'MALE' });

    expect(await remove(admin, id)).toEqual({ id });
    expect(await prisma.user.count({ where: { id } })).toBe(0);
    expect(await prisma.studentProfile.count({ where: { studentCode: '23010101' } })).toBe(0);
  });

  it('sinh viên đã có đơn đăng ký thì không xóa — giữ lịch sử, gợi ý khóa', async () => {
    const student = await createStudent('MALE');
    await createRegistration(student, (await createPeriod()).id, null);

    await expect(remove(admin, student.id)).rejects.toMatchObject({ status: 409, code: 'USER_HAS_HISTORY' });
    expect(await prisma.user.count({ where: { id: student.id } })).toBe(1);
  });

  it('quản lý từng duyệt đơn thì không xóa; quản lý chưa làm gì thì xóa được, tòa trống quản lý', async () => {
    const reviewer = await createManager((await createBuilding('MALE')).id);
    const registration = await createRegistration(await createStudent('MALE'), (await createPeriod()).id, null);
    await prisma.registration.update({ where: { id: registration.id }, data: { status: 'REJECTED', reviewedById: reviewer.id } });
    await expect(remove(admin, reviewer.id)).rejects.toMatchObject({ status: 409, code: 'USER_HAS_HISTORY' });

    const building = await createBuilding('FEMALE');
    const idle = await createManager(building.id);
    await remove(admin, idle.id);
    expect(await prisma.building.findUniqueOrThrow({ where: { id: building.id }, include: { manager: true } })).toMatchObject({
      manager: null,
    });
  });

  it('không tự xóa mình, không xóa tài khoản quản trị viên', async () => {
    await expect(remove(admin, admin.id)).rejects.toMatchObject({ status: 409, code: 'CANNOT_DELETE_SELF' });
    const other = await createAdmin();
    await expect(remove(admin, other.id)).rejects.toMatchObject({ status: 409, code: 'CANNOT_DELETE_ADMIN' });
  });
});
