import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/ui/input'
import { showFormError } from '@/lib/form'
import type { AuthUser } from '@/types/auth'
import { useChangePassword } from '../hooks/useAuth'

// Giữ khớp với changePasswordSchema ở backend/src/modules/auth/auth.schema.ts. Backend còn chặn
// mật khẩu mới trùng mật khẩu hiện tại và (sinh viên) trùng mã SV — lỗi gắn về đúng ô.
const schema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(72, 'Mật khẩu tối đa 72 ký tự'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

/**
 * Form đổi mật khẩu — dùng cho trang bắt đổi mật khẩu ban đầu và hộp thoại tự đổi.
 * Nơi dùng tự đặt nút gửi qua `footer` (trang: một nút rộng; hộp thoại: Hủy + Lưu).
 */
export function ChangePasswordForm({
  currentLabel = 'Mật khẩu hiện tại',
  onDone,
  footer,
}: {
  currentLabel?: string
  onDone: (user: AuthUser) => void
  footer: (isPending: boolean) => ReactNode
}) {
  const change = useChangePassword()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })
  const err = form.formState.errors

  // mutateAsync thay vì callback của mutate: đổi xong route guard có thể đã gỡ form này
  // (hết cờ bắt đổi), callback của mutate khi đó bị bỏ qua còn promise thì vẫn trả về.
  async function onSubmit({ currentPassword, newPassword }: FormValues) {
    try {
      onDone(await change.mutateAsync({ currentPassword, newPassword }))
    } catch (error) {
      showFormError(form, error)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField label={currentLabel} htmlFor="cp-current" error={err.currentPassword?.message}>
        <Input id="cp-current" type="password" autoComplete="current-password" {...form.register('currentPassword')} />
      </FormField>
      <FormField
        label="Mật khẩu mới"
        htmlFor="cp-new"
        error={err.newPassword?.message}
        hint="Ít nhất 6 ký tự, khác mật khẩu hiện tại."
      >
        <Input id="cp-new" type="password" autoComplete="new-password" {...form.register('newPassword')} />
      </FormField>
      <FormField label="Nhập lại mật khẩu mới" htmlFor="cp-confirm" error={err.confirmPassword?.message}>
        <Input id="cp-confirm" type="password" autoComplete="new-password" {...form.register('confirmPassword')} />
      </FormField>
      {footer(change.isPending)}
    </form>
  )
}
