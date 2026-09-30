import { QueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'

/**
 * Cấu hình dùng chung cho toàn bộ server state.
 *
 * `queryKey` đặt theo module kèm bộ lọc: ['rooms', filters] — sau mutation thì
 * `invalidateQueries` theo tiền tố module (xem docs/convention.md §7).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Giữ mặc định của TanStack Query (staleTime = 0, tải lại khi quay về cửa sổ):
      // dữ liệu ở đây do nhiều người cùng sửa — Manager duyệt đơn thì trang của SV
      // phải thấy mà không cần F5. Mở trang vẫn hiện ngay bản đã có trong cache,
      // chỉ tải lại ngầm rồi cập nhật.

      // Thử lại chỉ có ý nghĩa với lỗi mạng hoặc lỗi máy chủ. Lỗi 4xx (sai
      // dữ liệu, hết quyền, không tìm thấy) thì gọi lại bao nhiêu lần cũng vậy.
      retry(failureCount, error) {
        if (error instanceof AxiosError) {
          const status = error.response?.status
          if (status && status >= 400 && status < 500) return false
        }
        return failureCount < 2
      },
    },
    mutations: {
      retry: false,
    },
  },
})
