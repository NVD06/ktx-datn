import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { showFormError } from '@/lib/form'
import type { RegistrationPeriod } from '@/types/registration'
import { useSaveRegistrationPeriod } from '../hooks/useRegistrationPeriods'

// Giữ khớp với backend/src/modules/registration-periods/registration-period.schema.ts.
const schema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Tên đợt đăng ký không được để trống')
      .max(100, 'Tên đợt đăng ký tối đa 100 ký tự'),
    startAt: z.string().min(1, 'Vui lòng chọn ngày bắt đầu'),
    endAt: z.string().min(1, 'Vui lòng chọn ngày kết thúc'),
  })
  // Chuỗi YYYY-MM-DD so sánh được trực tiếp. Cùng ngày vẫn hợp lệ vì endAt lấy cuối ngày.
  .refine((v) => !v.startAt || !v.endAt || v.endAt >= v.startAt, {
    message: 'Ngày kết thúc không được trước ngày bắt đầu',
    path: ['endAt'],
  })

type FormValues = z.infer<typeof schema>

/** ISO -> "2026-09-01" theo giờ máy người dùng, cho <input type="date">. */
function toDateInput(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Ngày bắt đầu tính từ 00:00, ngày kết thúc tính hết 23:59:59 của ngày đó. */
function toIso(date: string, edge: 'start' | 'end') {
  return new Date(`${date}T${edge === 'start' ? '00:00:00' : '23:59:59'}`).toISOString()
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Có = sửa, không có = thêm mới. */
  period?: RegistrationPeriod | null
}

export function RegistrationPeriodFormDialog({ open, onOpenChange, period }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{period ? 'Sửa đợt đăng ký' : 'Thêm đợt đăng ký'}</DialogTitle>
          <DialogDescription>
            {period ? 'Đổi tên hoặc thời gian của đợt.' : 'Đợt mới tạo ở trạng thái đóng — mở đợt từ bảng.'}
          </DialogDescription>
        </DialogHeader>
        {/* Form nằm trong DialogContent nên được tạo mới mỗi lần mở — không cần reset tay. */}
        <RegistrationPeriodForm period={period} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function RegistrationPeriodForm({
  period,
  onDone,
}: {
  period?: RegistrationPeriod | null
  onDone: () => void
}) {
  const save = useSaveRegistrationPeriod()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: period
      ? { name: period.name, startAt: toDateInput(period.startAt), endAt: toDateInput(period.endAt) }
      : { name: '', startAt: '', endAt: '' },
  })
  const err = form.formState.errors

  function onSubmit(values: FormValues) {
    const input = {
      name: values.name,
      startAt: toIso(values.startAt, 'start'),
      endAt: toIso(values.endAt, 'end'),
    }
    save.mutate(
      { id: period?.id, input },
      {
        onSuccess() {
          toast.success(period ? 'Đã cập nhật đợt đăng ký' : 'Đã thêm đợt đăng ký')
          onDone()
        },
        onError: (error) => showFormError(form, error),
      },
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField label="Tên đợt" htmlFor="rp-name" error={err.name?.message}>
        <Input id="rp-name" placeholder="Đăng ký học kỳ 1 năm 2026-2027" {...form.register('name')} />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Ngày bắt đầu" htmlFor="rp-start" error={err.startAt?.message}>
          <Input id="rp-start" type="date" {...form.register('startAt')} />
        </FormField>
        <FormField label="Ngày kết thúc" htmlFor="rp-end" error={err.endAt?.message}>
          <Input id="rp-end" type="date" {...form.register('endAt')} />
        </FormField>
      </div>

      <p className="tone-info rounded-md border p-2.5 text-xs">
        Hệ thống không tự đóng đợt khi qua ngày kết thúc — quản trị viên đóng đợt bằng tay.
      </p>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={save.isPending}>
          Hủy
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Đang lưu…' : 'Lưu'}
        </Button>
      </DialogFooter>
    </form>
  )
}
