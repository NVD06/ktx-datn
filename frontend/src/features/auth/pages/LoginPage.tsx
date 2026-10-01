import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router-dom'
import { z } from 'zod'
import { getErrorMessage } from '@/api/client'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth, useLogin } from '@/features/auth/hooks/useAuth'
import { redirectAfterLogin } from '@/routes/paths'

const loginSchema = z.object({
  email: z.email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const { user, isLoading } = useAuth()
  const login = useLogin()
  const location = useLocation()

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  // Đã đăng nhập rồi thì không cho ở lại trang này. Nếu bị ProtectedRoute đẩy
  // tới đây thì quay lại đúng trang cũ, không thì về trang chủ theo vai trò.
  if (!isLoading && user) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={redirectAfterLogin(user.role, from)} replace />
  }

  const err = form.formState.errors

  function onSubmit(values: LoginForm) {
    login.mutate(values)
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Đăng nhập</CardTitle>
          <CardDescription>Hệ thống quản lý ký túc xá sinh viên</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField label="Email" htmlFor="email" error={err.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="sv001@ktx.edu.vn"
                {...form.register('email')}
              />
            </FormField>

            <FormField label="Mật khẩu" htmlFor="password" error={err.password?.message}>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register('password')}
              />
            </FormField>

            {login.isError && (
              <p className="bg-destructive/10 text-destructive rounded-md p-2 text-sm">
                {getErrorMessage(login.error, 'Email hoặc mật khẩu không đúng')}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </Button>
          </form>

          <p className="text-muted-foreground mt-4 text-center text-sm">
            Chưa có tài khoản? Liên hệ ban quản lý ký túc xá để được cấp.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
