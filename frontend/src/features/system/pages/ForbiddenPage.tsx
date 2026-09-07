import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { homePathFor } from '@/routes/paths'

export function ForbiddenPage() {
  const { user } = useAuth()

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-muted-foreground text-6xl font-semibold">403</p>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Không có quyền truy cập</h1>
        <p className="text-muted-foreground text-sm">
          Tài khoản của bạn không được phép xem trang này.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to={user ? homePathFor(user.role) : '/login'}>Quay lại trang chính</Link>
      </Button>
    </main>
  )
}
