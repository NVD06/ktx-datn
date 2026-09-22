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

const OTHER_GENDER: Record<Gender, Gender> = { MALE: 'FEMALE', FEMALE: 'MALE' };

/**
 * Phòng mà sinh viên giới tính `gender` được ở:
 *   - tòa cùng giới tính: mọi phòng;
 *   - tòa hỗn hợp: phòng chưa có ai khác giới đang ở hoặc đã được xếp vào.
 *     Tòa hỗn hợp vẫn tách phòng nam/nữ — phòng không lưu giới tính mà mang
 *     giới tính của người đang ở, phòng trống thì ai cũng vào được.
 */
export function roomForGender(gender: Gender): Prisma.RoomWhereInput {
  return {
    OR: [
      { building: { gender } },
      {
        building: { gender: null },
        NOT: {
          beds: {
            some: {
              contracts: {
                some: {
                  status: { in: [...HOLDING_CONTRACT_STATUSES] },
                  registration: { student: { profile: { gender: OTHER_GENDER[gender] } } },
                },
              },
            },
          },
        },
      },
    ],
  };
}
