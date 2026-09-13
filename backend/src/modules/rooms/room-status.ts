import type { Prisma } from '../../generated/prisma/client.js';
import type { BedStatus } from '../../generated/prisma/enums.js';

/**
 * Trạng thái phòng KHÔNG lưu trong DB mà tính từ trạng thái giường —
 * `Bed.status` là nguồn sự thật duy nhất (database.md §3.1). Lưu thêm cột
 * trên Room thì hai nơi có thể lệch nhau.
 */
export const ROOM_STATUSES = ['AVAILABLE', 'FULL', 'MAINTENANCE'] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

/**
 * - AVAILABLE   còn ít nhất một giường trống
 * - FULL        có giường và mọi giường đều có người ở
 * - MAINTENANCE không còn giường trống, nhưng không phải vì đầy người
 *               (có giường bảo trì, hoặc phòng chưa có giường nào)
 */
export function summarizeBeds(beds: { status: BedStatus }[]) {
  let availableBeds = 0;
  let occupiedBeds = 0;
  let maintenanceBeds = 0;

  for (const bed of beds) {
    if (bed.status === 'AVAILABLE') availableBeds++;
    else if (bed.status === 'OCCUPIED') occupiedBeds++;
    else maintenanceBeds++;
  }

  const status: RoomStatus =
    availableBeds > 0
      ? 'AVAILABLE'
      : beds.length > 0 && occupiedBeds === beds.length
        ? 'FULL'
        : 'MAINTENANCE';

  return { bedCount: beds.length, availableBeds, occupiedBeds, maintenanceBeds, status };
}

/**
 * Điều kiện `where` tương đương `summarizeBeds().status`, để lọc theo trạng thái
 * ngay trong database — lọc sau khi query sẽ làm sai phân trang.
 */
export function roomStatusWhere(status: RoomStatus): Prisma.RoomWhereInput {
  switch (status) {
    case 'AVAILABLE':
      return { beds: { some: { status: 'AVAILABLE' } } };
    case 'FULL':
      return { beds: { some: {}, every: { status: 'OCCUPIED' } } };
    case 'MAINTENANCE':
      return {
        AND: [
          { beds: { none: { status: 'AVAILABLE' } } },
          { OR: [{ beds: { none: {} } }, { beds: { some: { status: 'MAINTENANCE' } } }] },
        ],
      };
  }
}
