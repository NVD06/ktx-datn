import { AxiosError } from 'axios'
import { apiGet, apiPost } from './client'
import type { AuthUser, ChangePasswordInput } from '@/types/auth'

/**
 * Các hàm gọi API xác thực.
 *
 * Auth.js có kiểu giao tiếp riêng (form-urlencoded + CSRF token + trả HTTP 302
 * thay vì JSON), nên toàn bộ phần "kỳ quặc" đó được gói gọn trong file này.
 * Phần còn lại của frontend chỉ gọi login / logout / getMe như hàm bình thường.
 */

const AUTH_BASE = '/auth'

async function getCsrfToken(): Promise<string> {
  const res = await fetch(`${AUTH_BASE}/csrf`, { credentials: 'include' })
  if (!res.ok) throw new Error('Không kết nối được tới máy chủ')
  const data = (await res.json()) as { csrfToken: string }
  return data.csrfToken
}

/** Người dùng hiện tại, hoặc null nếu chưa đăng nhập. */
export async function getMe(): Promise<AuthUser | null> {
  try {
    return await apiGet<AuthUser>('/auth/me')
  } catch (error) {
    // 401 là trạng thái hợp lệ: chưa đăng nhập. Lỗi mạng / 500 thì ném tiếp để giao
    // diện báo lỗi và cho thử lại, thay vì coi như đã đăng xuất.
    if (error instanceof AxiosError && error.response?.status === 401) return null
    throw error
  }
}

/**
 * Đăng nhập. Auth.js không trả JSON mà trả 302 kèm Set-Cookie, nên không đọc
 * được kết quả trực tiếp — cách chắc chắn là hỏi lại backend xem cookie có
 * hiệu lực không.
 */
export async function login(email: string, password: string): Promise<AuthUser> {
  const csrfToken = await getCsrfToken()

  await fetch(`${AUTH_BASE}/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken, email, password }),
    credentials: 'include',
    redirect: 'manual', // đừng đi theo 302 của Auth.js
  })

  const user = await getMe()
  if (!user) throw new Error('Email hoặc mật khẩu không đúng')
  return user
}

export async function logout(): Promise<void> {
  const csrfToken = await getCsrfToken()

  await fetch(`${AUTH_BASE}/signout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken }),
    credentials: 'include',
    redirect: 'manual',
  })
}

/**
 * Đổi mật khẩu — trả người dùng hiện tại, `mustChangePassword` đã về false. Không có
 * đăng ký: tài khoản sinh viên do Admin cấp (api/users.ts).
 */
export function changePassword(input: ChangePasswordInput): Promise<AuthUser> {
  return apiPost<AuthUser>('/auth/change-password', input)
}
