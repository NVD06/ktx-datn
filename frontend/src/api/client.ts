import axios, { AxiosError } from 'axios'
import type { ErrorResponse, ListParams, Paged, SuccessResponse } from '@/types/api'

/**
 * Instance axios duy nhất của ứng dụng — mọi lời gọi API đều đi qua đây.
 *
 * `baseURL` là đường dẫn tương đối để đi qua Vite proxy: trình duyệt coi
 * frontend và backend là cùng origin, nhờ đó cookie httpOnly của Auth.js được
 * gửi kèm mà không cần cấu hình CORS (xem docs/convention.md §4.3).
 */
export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

/** Lấy thông báo lỗi tiếng Việt do backend trả về, thay vì "Request failed with status code 409". */
export function getErrorMessage(error: unknown, fallback = 'Đã có lỗi xảy ra'): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ErrorResponse | undefined
    if (data && data.success === false) return data.error.message
    if (!error.response) return 'Không kết nối được tới máy chủ'
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

/** Lỗi validate theo từng field (response 400) — để gắn vào react-hook-form. */
export function getFieldErrors(error: unknown): Record<string, string[]> | undefined {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ErrorResponse | undefined
    if (data && data.success === false) return data.error.details
  }
  return undefined
}

/*
 * Endpoint trả `{ success, data }` — ba hàm dưới bóc sẵn `data` để các file
 * api/* chỉ còn khai báo đường dẫn và kiểu.
 */

export async function apiGet<T>(url: string): Promise<T> {
  return (await api.get<SuccessResponse<T>>(url)).data.data
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  return (await api.post<SuccessResponse<T>>(url, body)).data.data
}

export async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  return (await api.patch<SuccessResponse<T>>(url, body)).data.data
}

/**
 * Gọi API danh sách có phân trang. Tham số rỗng bị bỏ đi để backend không nhận
 * chuỗi "" (ví dụ `?status=` sẽ bị zod từ chối vì không thuộc enum).
 */
export async function getPaged<T>(url: string, params: ListParams = {}): Promise<Paged<T>> {
  const query = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  )
  const res = await api.get<SuccessResponse<T[]>>(url, { params: query })
  const { data, meta } = res.data
  return { data, meta: meta ?? { page: 1, limit: data.length, total: data.length } }
}

/** Những endpoint được phép trả 401 mà không đá người dùng ra trang đăng nhập. */
const SILENT_401 = ['/auth/me']

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const url = error.config?.url ?? ''
    const isSilent = SILENT_401.some((path) => url.includes(path))
    const onLoginPage = window.location.pathname === '/login'

    // Phiên hết hạn hoặc bị khóa giữa chừng -> quay về trang đăng nhập.
    // Bỏ qua /auth/me vì nó trả 401 một cách hợp lệ khi chưa đăng nhập.
    if (error.response?.status === 401 && !isSilent && !onLoginPage) {
      window.location.href = '/login'
    }

    return Promise.reject(error)
  },
)
