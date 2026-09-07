import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import * as authApi from '@/api/auth'
import { getErrorMessage } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Giữ khớp với backend/src/modules/auth/auth.schema.ts — validate 2 lớp,
// nhưng backend mới là nơi quyết định (xem docs/convention.md §3).
const registerSchema = z
  .object({
    email: z.email('Email không hợp lệ'),
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
    confirmPassword: z.string(),
    fullName: z.string().min(2, 'Họ tên quá ngắn'),
    studentCode: z.string().min(3, 'Mã sinh viên quá ngắn'),
    gender: z.enum(['MALE', 'FEMALE']),
    className: z.string().optional(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  })

type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      studentCode: '',
      gender: 'MALE',
      className: '',
    },
  })

  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess() {
      // Không tự đăng nhập sau khi đăng ký — để người dùng đăng nhập lại,
      // xác nhận họ nhớ đúng mật khẩu vừa đặt.
      void navigate('/login', { replace: true })
    },
  })

  function onSubmit(values: RegisterForm) {
    const { confirmPassword: _confirm, className, ...rest } = values
    register.mutate({ ...rest, ...(className ? { className } : {}) })
  }

  const err = form.formState.errors

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Đăng ký</CardTitle>
          <CardDescription>Dành cho sinh viên đăng ký tài khoản mới</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="fullName">Họ và tên</Label>
                <Input id="fullName" {...form.register('fullName')} />
                {err.fullName && <p className="text-destructive text-sm">{err.fullName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentCode">Mã sinh viên</Label>
                <Input id="studentCode" placeholder="SV005" {...form.register('studentCode')} />
                {err.studentCode && (
                  <p className="text-destructive text-sm">{err.studentCode.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register('email')} />
              {err.email && <p className="text-destructive text-sm">{err.email.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="gender">Giới tính</Label>
                <select
                  id="gender"
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                  {...form.register('gender')}
                >
                  <option value="MALE">Nam</option>
                  <option value="FEMALE">Nữ</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="className">Lớp</Label>
                <Input id="className" placeholder="CNTT1" {...form.register('className')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input id="password" type="password" {...form.register('password')} />
              {err.password && <p className="text-destructive text-sm">{err.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Nhập lại mật khẩu</Label>
              <Input id="confirmPassword" type="password" {...form.register('confirmPassword')} />
              {err.confirmPassword && (
                <p className="text-destructive text-sm">{err.confirmPassword.message}</p>
              )}
            </div>

            {register.isError && (
              <p className="bg-destructive/10 text-destructive rounded-md p-2 text-sm">
                {getErrorMessage(register.error)}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={register.isPending}>
              {register.isPending ? 'Đang tạo tài khoản…' : 'Đăng ký'}
            </Button>
          </form>

          <p className="text-muted-foreground mt-4 text-center text-sm">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-foreground underline underline-offset-4">
              Đăng nhập
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
