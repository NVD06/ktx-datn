import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import * as authApi from '@/api/auth'
import type { AuthUser } from '@/types/auth'

/** Khóa dùng chung cho toàn bộ trạng thái đăng nhập. */
export const AUTH_QUERY_KEY = ['auth', 'me'] as const

/**
 * Người dùng đang đăng nhập.
 *
 * `getMe()` trả null thay vì ném lỗi khi chưa đăng nhập, nên đây là truy vấn
 * luôn thành công — `user === null` nghĩa là khách vãng lai.
 */
export function useAuth() {
  const query = useQuery<AuthUser | null>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: authApi.getMe,
    staleTime: Infinity, // chỉ đổi khi đăng nhập/đăng xuất, không tự làm mới
    retry: false,
  })

  return {
    user: query.data ?? null,
    isLoading: query.isPending,
    isAuthenticated: !!query.data,
  }
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess(user) {
      // Ghi thẳng kết quả vào cache, khỏi phải gọi lại /auth/me.
      queryClient.setQueryData(AUTH_QUERY_KEY, user)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess() {
      // Cập nhật trạng thái đăng nhập TRƯỚC, và cố ý không dùng
      // queryClient.clear(): clear() gỡ query khỏi cache nhưng observer đang
      // mounted vẫn giữ tham chiếu tới query cũ, nên component không nhận được
      // thông báo và route guard không kịp điều hướng.
      queryClient.setQueryData(AUTH_QUERY_KEY, null)

      // Xóa dữ liệu của mọi module khác — không để người đăng nhập kế tiếp
      // trên cùng máy nhìn thấy dữ liệu của người trước.
      queryClient.removeQueries({
        predicate: (q) => q.queryKey[0] !== AUTH_QUERY_KEY[0],
      })

      void navigate('/login', { replace: true })
    },
  })
}
