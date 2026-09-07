import { Navigate } from 'react-router-dom'
import { FullPageLoading } from '@/components/shared/QueryState'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { homePathFor } from '@/routes/paths'

/** '/' không có nội dung riêng — đưa người dùng về đúng khu của họ. */
export function HomeRedirect() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <FullPageLoading />
  }

  return <Navigate to={user ? homePathFor(user.role) : '/login'} replace />
}
