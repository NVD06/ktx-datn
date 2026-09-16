import type { Role } from '@/types/auth'

/**
 * Trang mặc định của từng vai trò sau khi đăng nhập.
 * Gom vào một chỗ để mọi nơi điều hướng đều nhất quán.
 */
export function homePathFor(role: Role): string {
  return role === 'STUDENT' ? '/student' : '/admin/dashboard'
}

/** Tiền tố đường dẫn mà từng vai trò được phép vào. */
const AREA: Record<Role, string> = {
  ADMIN: '/admin',
  MANAGER: '/admin',
  STUDENT: '/student',
}

/**
 * Nơi cần tới sau khi đăng nhập.
 *
 * `from` là trang người dùng định vào trước khi bị ProtectedRoute chặn lại.
 * Chỉ quay lại đó nếu nó thuộc khu vực của vai trò này — nếu không, một sinh
 * viên đăng nhập sau khi ai đó vừa thử vào /admin sẽ bị ném thẳng vào trang 403.
 */
export function redirectAfterLogin(role: Role, from?: string | null): string {
  if (from && from.startsWith(AREA[role])) return from
  return homePathFor(role)
}
