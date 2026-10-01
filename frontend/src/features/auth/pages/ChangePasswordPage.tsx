import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { homePathFor } from '@/routes/paths'
import { ChangePasswordForm } from '../components/ChangePasswordForm'
import { useAuth, useLogout } from '../hooks/useAuth'

/**
 * Bắt đổi mật khẩu ban đầu do Admin cấp (sinh viên: mã SV) ở lần đăng nhập đầu. Route guard
 * đưa mọi trang khác về đây tới khi đổi xong; đổi xong thì cờ trong cache mất và trang tự
 * chuyển về trang chủ theo vai trò. Tự đổi mật khẩu lúc khác dùng hộp thoại ở sidebar.
 */
export function ChangePasswordPage() {
  const { user } = useAuth()
  const logout = useLogout()

  // ProtectedRoute bọc ngoài nên luôn có user; không bị bắt đổi thì không ở lại trang này.
  if (!user) return null
  if (!user.mustChangePassword) return <Navigate to={homePathFor(user.role)} replace />

  const isStudent = user.role === 'STUDENT'

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Đổi mật khẩu</CardTitle>
          <CardDescription>
            Xin chào {user.fullName}. Bạn đang dùng mật khẩu ban đầu
            {isStudent && ' (mã sinh viên)'} do ban quản lý cấp — hãy đặt mật khẩu mới trước khi tiếp tục.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ChangePasswordForm
            currentLabel={isStudent ? 'Mật khẩu hiện tại (mã sinh viên)' : 'Mật khẩu hiện tại'}
            onDone={() => toast.success('Đã đổi mật khẩu')}
            footer={(isPending) => (
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Đang lưu…' : 'Đổi mật khẩu'}
              </Button>
            )}
          />

          <p className="text-muted-foreground mt-4 text-center text-sm">
            Không phải tài khoản của bạn?{' '}
            <button
              type="button"
              className="text-foreground underline underline-offset-4"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
            >
              Đăng xuất
            </button>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
