import { prisma } from '../../config/prisma.js';
import type { AuthUser } from '../../types/auth-user.js';
import { paginate, type ListQuery } from '../../utils/paginate.js';
import { ownBuildingScope } from '../../utils/scope.js';

/**
 * Danh sách tòa nhà.
 *
 * Phạm vi quyền nằm ngay trong `where`: Admin thấy tất cả, Manager chỉ thấy
 * tòa được gán. Không có nhánh `if` nào sau khi query — dữ liệu ngoài phạm vi
 * không bao giờ ra khỏi database.
 *
 * US-01 sẽ bổ sung create / update / delete cho module này.
 */
export function list(user: AuthUser, query: ListQuery) {
  const where = { ...ownBuildingScope(user) };
  return paginate(prisma.building, where, query);
}
