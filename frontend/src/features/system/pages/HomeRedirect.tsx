import { Navigate } from 'react-router-dom'
import { FullPageLoading } from '@/components/shared/QueryState'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { LandingPage } from '@/features/landing/pages/LandingPage'
import { homePathFor } from '@/routes/paths'

/**
 * '/' — khách thấy trang giới thiệu, người đã đăng nhập về thẳng khu của họ.
 *
 * Không hỏi được máy chủ (`error`) vẫn hiện trang giới thiệu: nội dung tĩnh,
 * không cần đăng nhập; bấm Đăng nhập thì trang /login tự xử lý lỗi kết nối.
 */
export function HomeRedirect() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <FullPageLoading />
  }

  return user ? <Navigate to={homePathFor(user.role)} replace /> : <LandingPage />
}
