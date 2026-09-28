import type { Prisma } from '../../generated/prisma/client.js';
import type { BedStatus } from '../../generated/prisma/enums.js';
import { FREE_BED } from './room-eligibility.js';

/**
 * Trạng thái phòng KHÔNG lưu trong DB mà tính từ trạng thái giường —
 * `Bed.status` là nguồn sự thật duy nhất (database.md §3.1). Lưu thêm cột
 * trên Room thì hai nơi có thể lệch nhau.
 */
export const ROOM_STATUSES = ['AVAILABLE', 'FULL', 'MAINTENANCE'] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

/**
 * Giường đang giữ chỗ: còn AVAILABLE nhưng đã có hợp đồng DRAFT chờ SV ký — không
 * nhận thêm người, cùng quy tắc với FREE_BED khi duyệt đơn.
 */
const HELD_BED = { status: 'AVAILABLE', contracts: { some: { status: 'DRAFT' } } } as const satisfies Prisma.BedWhereInput;

/** Cột cần để tính trạng thái: trạng thái giường + số hợp đồng DRAFT đang giữ nó. */
export const BED_STATE_SELECT = {
  status: true,
  _count: { select: { contracts: { where: { status: 'DRAFT' } } } },
} as const satisfies Prisma.BedSelect;

type BedState = { status: BedStatus; _count: { contracts: number } };

export function isHeld(bed: BedState) {
  return bed.status === 'AVAILABLE' && bed._count.contracts > 0;
}

/**
 * - AVAILABLE   còn ít nhất một giường trống thật sự (không bị giữ chỗ)
 * - FULL        có giường và mọi giường đều có người ở hoặc đang giữ chỗ
 * - MAINTENANCE không còn giường trống, nhưng không phải vì đầy người
 *               (có giường bảo trì, hoặc phòng chưa có giường nào)
 */
export function summarizeBeds(beds: BedState[]) {
  let availableBeds = 0;
  let heldBeds = 0;
  let occupiedBeds = 0;
  let maintenanceBeds = 0;

  for (const bed of beds) {
    if (bed.status === 'OCCUPIED') occupiedBeds++;
    else if (bed.status === 'MAINTENANCE') maintenanceBeds++;
    else if (isHeld(bed)) heldBeds++;
    else availableBeds++;
  }

  const status: RoomStatus =
    availableBeds > 0
      ? 'AVAILABLE'
      : beds.length > 0 && occupiedBeds + heldBeds === beds.length
        ? 'FULL'
        : 'MAINTENANCE';

  return { bedCount: beds.length, availableBeds, heldBeds, occupiedBeds, maintenanceBeds, status };
}

/**
 * Điều kiện `where` tương đương `summarizeBeds().status`, để lọc theo trạng thái
 * ngay trong database — lọc sau khi query sẽ làm sai phân trang.
 */
export function roomStatusWhere(status: RoomStatus): Prisma.RoomWhereInput {
  switch (status) {
    case 'AVAILABLE':
      return { beds: { some: FREE_BED } };
    case 'FULL':
      return { beds: { some: {}, every: { OR: [{ status: 'OCCUPIED' }, HELD_BED] } } };
    case 'MAINTENANCE':
      return {
        AND: [
          { beds: { none: FREE_BED } },
          { OR: [{ beds: { none: {} } }, { beds: { some: { status: 'MAINTENANCE' } } }] },
        ],
      };
  }
}
