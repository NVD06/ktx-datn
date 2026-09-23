import { Navigate } from 'react-router-dom'
import { FullPageError, FullPageLoading } from '@/components/shared/QueryState'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { homePathFor } from '@/routes/paths'

/** '/' không có nội dung riêng — đưa người dùng về đúng khu của họ. */
export function HomeRedirect() {
  const { user, isLoading, error, retry, isRetrying } = useAuth()

  if (isLoading) {
    return <FullPageLoading />
  }

  if (error) {
    return <FullPageError error={error} onRetry={retry} isRetrying={isRetrying} />
  }

  return <Navigate to={user ? homePathFor(user.role) : '/login'} replace />
}
