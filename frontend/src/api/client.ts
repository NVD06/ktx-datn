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

/** Phần `error` trong body lỗi `{ success: false, error }` của backend, nếu có. */
function errorBody(error: unknown): ErrorResponse['error'] | undefined {
  if (!(error instanceof AxiosError)) return undefined
  const data = error.response?.data as ErrorResponse | undefined
  return data?.success === false ? data.error : undefined
}

/** Lấy thông báo lỗi tiếng Việt do backend trả về, thay vì "Request failed with status code 409". */
export function getErrorMessage(error: unknown, fallback = 'Đã có lỗi xảy ra'): string {
  const body = errorBody(error)
  if (body) return body.message
  if (error instanceof AxiosError && !error.response) return 'Không kết nối được tới máy chủ'
  if (error instanceof Error && error.message) return error.message
  return fallback
}

/** Mã lỗi nghiệp vụ của backend (`BED_TAKEN`, `REGISTRATION_NOT_PENDING`…) — để xử lý riêng từng loại. */
export function getErrorCode(error: unknown): string | undefined {
  return errorBody(error)?.code
}

/** Lỗi validate theo từng field (response 400) — để gắn vào react-hook-form. */
export function getFieldErrors(error: unknown): Record<string, string[]> | undefined {
  return errorBody(error)?.details
}

/*
 * Endpoint trả `{ success, data }` — ba hàm dưới bóc sẵn `data` để các file
 * api/* chỉ còn khai báo đường dẫn và kiểu.
 */

/**
 * Bỏ tham số rỗng để backend không nhận chuỗi "" — ví dụ `?status=` từ bộ lọc chưa
 * chọn sẽ bị zod từ chối vì không thuộc enum. Dùng cho mọi request GET.
 */
function queryOf(params?: object) {
  return params && Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''))
}

export async function apiGet<T>(url: string, params?: object): Promise<T> {
  return (await api.get<SuccessResponse<T>>(url, { params: queryOf(params) })).data.data
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  return (await api.post<SuccessResponse<T>>(url, body)).data.data
}

export async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  return (await api.patch<SuccessResponse<T>>(url, body)).data.data
}

/** Gọi API danh sách có phân trang. */
export async function getPaged<T>(url: string, params: ListParams = {}): Promise<Paged<T>> {
  const res = await api.get<SuccessResponse<T[]>>(url, { params: queryOf(params) })
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
