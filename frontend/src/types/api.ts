/**
 * Định dạng response của backend — chép từ backend/src/types/response.ts.
 * Hai bên là 2 dự án độc lập nên type dùng chung được đồng bộ thủ công
 * (xem docs/convention.md §1). Sửa ở backend thì nhớ sửa cả ở đây.
 */

export interface PaginationMeta {
  page: number
  limit: number
  total: number
}

export interface SuccessResponse<T> {
  success: true
  data: T
  meta?: PaginationMeta
}

export interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    /** Lỗi validate theo từng field, chỉ có ở response 400. */
    details?: Record<string, string[]>
  }
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse

export type SortOrder = 'asc' | 'desc'

/** Query string của API danh sách — khớp listQuerySchema ở backend. */
export type ListParams = Record<string, string | number | boolean | undefined>

export interface Paged<T> {
  data: T[]
  meta: PaginationMeta
}
