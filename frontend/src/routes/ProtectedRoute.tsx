import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { FullPageError, FullPageLoading } from '@/components/shared/QueryState'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { Role } from '@/types/auth'

interface Props {
  /** Bỏ trống = chỉ cần đăng nhập, không giới hạn vai trò. */
  roles?: Role[]
}

/**
 * Chặn truy cập ở phía giao diện.
 *
 * Đây CHỈ là trải nghiệm người dùng — ẩn menu, điều hướng cho gọn. Không phải
 * cơ chế bảo mật: ai cũng sửa được state trong DevTools. Quyền thật luôn được
 * backend kiểm tra lại ở requireRole + buildingScope (docs/convention.md §5.5).
 */
export function ProtectedRoute({ roles }: Props) {
  const { user, isLoading, error, retry, isRetrying } = useAuth()
  const location = useLocation()

  // Chờ /auth/me trả lời xong mới quyết định, tránh chớp trang login rồi
  // lại nhảy vào trang trong khi người dùng thực ra đang đăng nhập.
  if (isLoading) {
    return <FullPageLoading />
  }

  // Máy chủ không trả lời: chưa biết đã đăng nhập hay chưa nên không đẩy về /login.
  if (error) {
    return <FullPageError error={error} onRetry={retry} isRetrying={isRetrying} />
  }

  if (!user) {
    // Nhớ trang đang muốn vào (kèm bộ lọc trên URL) để đăng nhập xong quay lại đúng chỗ.
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}
