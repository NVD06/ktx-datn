import type { Prisma } from '../../generated/prisma/client.js';
import type { Gender } from '../../generated/prisma/enums.js';

/*
 * Quy tắc "phòng nào nhận được sinh viên nào" — dùng chung cho trang chỗ trống
 * (US-02.2), kiểm tra nguyện vọng (US-02.3) và xếp giường khi duyệt (US-03).
 */

/**
 * Hợp đồng đang giữ giường: DRAFT (đã duyệt, chờ SV ký — giường vẫn AVAILABLE
 * nhưng đã có chủ) và ACTIVE (đang ở).
 */
export const HOLDING_CONTRACT_STATUSES = ['DRAFT', 'ACTIVE'] as const;

/**
 * Giường còn nhận người thật sự: trạng thái AVAILABLE **và** chưa bị hợp đồng
 * DRAFT giữ chỗ (registration-contract-flow.md, "Hợp đồng DRAFT giữ giường").
 */
export const FREE_BED = {
  status: 'AVAILABLE',
  contracts: { none: { status: 'DRAFT' } },
} as const satisfies Prisma.BedWhereInput;

/**
 * Phòng còn nhận người mới: phòng, tòa và loại phòng đều đang hoạt động.
 * Cùng một điều kiện cho trang chỗ trống, danh sách giường khi duyệt và lệnh duyệt.
 */
export const ASSIGNABLE_ROOM = {
  isActive: true,
  building: { isActive: true },
  roomType: { isActive: true },
} as const satisfies Prisma.RoomWhereInput;

export const OTHER_GENDER: Record<Gender, Gender> = { MALE: 'FEMALE', FEMALE: 'MALE' };

/** Giới tính trong câu thông báo: "sinh viên nam", "tòa nữ". */
export const GENDER_LABEL = { MALE: 'nam', FEMALE: 'nữ' } as const satisfies Record<Gender, string>;

/** Phòng mà sinh viên giới tính `gender` được ở: mọi phòng của tòa cùng giới tính (không có tòa hỗn hợp). */
export function roomForGender(gender: Gender): Prisma.RoomWhereInput {
  return { building: { gender } };
}
