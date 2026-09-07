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
      // Dữ liệu quản trị không đổi liên tục — 60s tránh gọi lại API mỗi lần
      // chuyển tab hoặc quay lại trang.
      staleTime: 60_000,
      refetchOnWindowFocus: false,

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
