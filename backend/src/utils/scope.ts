import type { AuthUser } from '../types/auth-user.js';
import { ApiError } from './api-error.js';

/**
 * Tầng 3 của phân quyền: giới hạn *phạm vi dữ liệu*.
 *
 * Trả về một mảnh điều kiện `where` của Prisma, trộn thẳng vào truy vấn.
 *
 * Nguyên tắc: KHÔNG query xong rồi mới kiểm tra quyền — nhét quyền vào `where`
 * để dữ liệu ngoài phạm vi không bao giờ ra khỏi database.
 *
 * Với thao tác ghi, dùng `updateMany`/`deleteMany` kèm scope rồi kiểm tra
 * `count === 0` -> 403, thay vì `update` theo id (xem docs/convention.md §5.3).
 */

/** Tòa nhà mà người dùng được phép thao tác, hoặc null nếu thấy tất cả. */
function allowedBuildingId(user: AuthUser): string | null {
  if (user.role === 'ADMIN') return null; // thấy toàn hệ thống

  if (user.role === 'MANAGER') {
    // Manager chưa được gán tòa thì không có dữ liệu nào thuộc phạm vi của họ.
    if (!user.buildingId) throw ApiError.forbidden('Tài khoản chưa được gán tòa nhà quản lý');
    return user.buildingId;
  }

  // STUDENT không truy cập dữ liệu theo tòa — dữ liệu của sinh viên lọc theo
  // studentId, xem từng service cụ thể.
  throw ApiError.forbidden();
}

/**
 * Dùng cho các model **tham chiếu tới** tòa nhà qua cột `buildingId` (Room…):
 *
 *   prisma.room.findMany({ where: { ...filters, ...buildingScope(user) } })
 *
 * Model cách Building một cấp thì lồng qua quan hệ:
 *
 *   prisma.maintenanceRequest.findMany({ where: { room: buildingScope(user) } })
 */
export function buildingScope(user: AuthUser): { buildingId?: string } {
  const id = allowedBuildingId(user);
  return id === null ? {} : { buildingId: id };
}

/**
 * Dùng cho **chính model Building** — nơi khóa là `id` chứ không phải `buildingId`:
 *
 *   prisma.building.findMany({ where: { ...filters, ...ownBuildingScope(user) } })
 *
 * Tách riêng vì dùng nhầm `buildingScope()` cho bảng Building sẽ khiến Prisma
 * báo `Unknown argument 'buildingId'`.
 */
export function ownBuildingScope(user: AuthUser): { id?: string } {
  const id = allowedBuildingId(user);
  return id === null ? {} : { id };
}

/**
 * Lỗi khi truy vấn đã kèm scope mà không ra bản ghi nào — tức là "không tồn tại"
 * hoặc "không thuộc phạm vi của bạn", hai trường hợp không phân biệt được.
 *
 * MANAGER nhận 403 cho cả hai trường hợp để không lộ id nào có thật. ADMIN không
 * bị giới hạn phạm vi nên chắc chắn là không tồn tại -> 404. STUDENT (dữ liệu của
 * chính mình, ví dụ hợp đồng) cũng nhận 404 — với sinh viên, thứ không phải của
 * mình coi như không tồn tại.
 */
export function outOfScope(user: AuthUser, notFoundMessage?: string): ApiError {
  return user.role === 'MANAGER' ? ApiError.forbidden() : ApiError.notFound(notFoundMessage);
}
