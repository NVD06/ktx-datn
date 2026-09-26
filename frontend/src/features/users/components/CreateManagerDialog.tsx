import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormDialog, FormDialogFooter } from '@/components/shared/FormDialog'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBuildings } from '@/features/buildings/hooks/useBuildings'
import { showFormError } from '@/lib/form'
import { useCreateManager } from '../hooks/useUsers'

// Radix Select không cho item có value rỗng.
const NO_BUILDING = '__none__'

// Giữ khớp với createManagerSchema ở backend/src/modules/users/user.schema.ts.
const schema = z.object({
  fullName: z.string().trim().min(2, 'Họ tên quá ngắn').max(100, 'Họ tên tối đa 100 ký tự'),
  email: z.string().trim().pipe(z.email('Email không hợp lệ')),
  phone: z
    .string()
    .trim()
    .regex(/^(0\d{9})?$/, 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(72, 'Mật khẩu tối đa 72 ký tự'),
  buildingId: z.string(),
})

type FormValues = z.infer<typeof schema>

/** Tòa gán được: đang hoạt động — lọc thêm "chưa có quản lý" ở phía dưới. */
const ACTIVE_BUILDINGS = { isActive: 'true', limit: 100, sortBy: 'name', order: 'asc' }

/** Admin tạo tài khoản quản lý (US-01.6) — vai trò luôn là quản lý, có thể gán tòa luôn. */
export function CreateManagerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Thêm tài khoản quản lý"
      description="Người quản lý đăng nhập được ngay bằng email và mật khẩu ban đầu này."
    >
      <CreateManagerForm onDone={() => onOpenChange(false)} />
    </FormDialog>
  )
}

function CreateManagerForm({ onDone }: { onDone: () => void }) {
  const create = useCreateManager()
  const buildings = useBuildings(ACTIVE_BUILDINGS)
  // Mỗi tòa tối đa một quản lý — chỉ gợi ý tòa còn trống, backend kiểm tra lại.
  const free = (buildings.data?.data ?? []).filter((b) => !b.manager)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', phone: '', password: '', buildingId: NO_BUILDING },
  })
  const err = form.formState.errors

  function onSubmit({ phone, buildingId, ...values }: FormValues) {
    const building = free.find((b) => b.id === buildingId)
    create.mutate(
      { ...values, ...(phone ? { phone } : {}), buildingId: building?.id ?? null },
      {
        onSuccess(user) {
          toast.success(
            `Đã tạo tài khoản quản lý ${user.fullName}` + (building ? `, quản lý tòa ${building.name}` : ''),
          )
          onDone()
        },
        onError: (error) => showFormError(form, error),
      },
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField label="Họ tên" htmlFor="mg-name" error={err.fullName?.message}>
        <Input id="mg-name" {...form.register('fullName')} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Email đăng nhập" htmlFor="mg-email" error={err.email?.message}>
          <Input id="mg-email" type="email" {...form.register('email')} />
        </FormField>
        <FormField label="Số điện thoại" htmlFor="mg-phone" error={err.phone?.message} hint="Không bắt buộc">
          <Input id="mg-phone" {...form.register('phone')} />
        </FormField>
      </div>
      <FormField label="Mật khẩu ban đầu" htmlFor="mg-password" error={err.password?.message}>
        <Input id="mg-password" type="password" autoComplete="new-password" {...form.register('password')} />
      </FormField>
      <FormField
        label="Tòa quản lý"
        htmlFor="mg-building"
        error={err.buildingId?.message}
        hint="Chỉ hiện tòa đang hoạt động và chưa có quản lý. Có thể gán sau ở mục Tòa nhà."
      >
        <Controller
          control={form.control}
          name="buildingId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="mg-building" className="w-full" disabled={buildings.isPending}>
                <SelectValue placeholder={buildings.isPending ? 'Đang tải…' : 'Chọn tòa'} />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value={NO_BUILDING}>Chưa gán tòa</SelectItem>
                {free.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    Tòa {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <FormDialogFooter onCancel={onDone} isPending={create.isPending} submitLabel="Tạo tài khoản" pendingLabel="Đang tạo…" />
    </form>
  )
}
