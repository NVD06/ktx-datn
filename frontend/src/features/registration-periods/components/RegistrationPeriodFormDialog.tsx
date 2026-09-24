import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormDialog, FormDialogFooter } from '@/components/shared/FormDialog'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/ui/input'
import { fromDateInput, toDateInput } from '@/lib/date-input'
import { showFormError } from '@/lib/form'
import type { RegistrationPeriod } from '@/types/registration'
import { useSaveRegistrationPeriod } from '../hooks/useRegistrationPeriods'

// Giữ khớp với backend/src/modules/registration-periods/registration-period.schema.ts.
// Chuỗi YYYY-MM-DD so sánh được trực tiếp. Cùng ngày vẫn hợp lệ vì ngày kết thúc lấy cuối ngày.
const day = z.string().min(1, 'Vui lòng chọn ngày')
const schema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Tên đợt đăng ký không được để trống')
      .max(100, 'Tên đợt đăng ký tối đa 100 ký tự'),
    term: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^\d{4}-(HK1|HK2|HE)$/, 'Mã học kỳ có dạng 2026-HK1, 2026-HK2 hoặc 2026-HE (học kỳ hè)'),
    startAt: day,
    endAt: day,
    stayStartAt: day,
    stayEndAt: day,
  })
  .superRefine((v, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
    if (v.startAt && v.endAt && v.endAt < v.startAt) issue('endAt', 'Không được trước ngày bắt đầu nhận đơn')
    else if (v.endAt && v.stayEndAt && v.endAt > v.stayEndAt) issue('endAt', 'Không được sau ngày kết thúc ở')
    if (v.stayStartAt && v.stayEndAt && v.stayEndAt < v.stayStartAt) issue('stayEndAt', 'Không được trước ngày bắt đầu ở')
    if (v.startAt && v.stayStartAt && v.stayStartAt < v.startAt) issue('stayStartAt', 'Không được trước ngày bắt đầu nhận đơn')
  })

type FormValues = z.infer<typeof schema>
type DateField = Exclude<keyof FormValues, 'name' | 'term'>

/** Hai khoảng thời gian của đợt — cùng một kiểu ô nhập "Từ ngày / Đến ngày". */
const RANGES: { legend: string; from: DateField; to: DateField; hint: string }[] = [
  {
    legend: 'Thời gian nhận đơn',
    from: 'startAt',
    to: 'endAt',
    hint: 'Chỉ để thông báo cho sinh viên — hệ thống không tự đóng đợt, quản trị viên đóng bằng tay.',
  },
  {
    legend: 'Thời gian ở',
    from: 'stayStartAt',
    to: 'stayEndAt',
    hint: 'Kỳ hạn của hợp đồng lập từ đợt này. Sửa sau không ảnh hưởng hợp đồng đã lập.',
  },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Có = sửa, không có = thêm mới. */
  period?: RegistrationPeriod | null
}

export function RegistrationPeriodFormDialog({ open, onOpenChange, period }: Props) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={period ? 'Sửa đợt đăng ký' : 'Thêm đợt đăng ký'}
      description={
        period
          ? 'Đổi tên hoặc thời gian của đợt.'
          : 'Đợt mới tạo ở trạng thái đóng — mở đợt từ bảng.'
      }
    >
      <RegistrationPeriodForm period={period} onDone={() => onOpenChange(false)} />
    </FormDialog>
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
  const dateFields = RANGES.flatMap((r) => [r.from, r.to])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: period?.name ?? '',
      term: period?.term ?? '',
      ...Object.fromEntries(dateFields.map((f) => [f, period ? toDateInput(period[f]) : ''])),
    },
  })
  const err = form.formState.errors

  function onSubmit(values: FormValues) {
    // Ngày bắt đầu tính từ 00:00, ngày kết thúc tính hết 23:59:59.
    const dates = Object.fromEntries(
      RANGES.flatMap((r) => [
        [r.from, fromDateInput(values[r.from], 'start')],
        [r.to, fromDateInput(values[r.to], 'end')],
      ]),
    ) as Record<DateField, string>
    save.mutate(
      { id: period?.id, input: { name: values.name, term: values.term, ...dates } },
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

      <FormField
        label="Mã học kỳ"
        htmlFor="rp-term"
        error={err.term?.message}
        hint="Năm bắt đầu năm học + học kỳ, ví dụ HK2 năm học 2026-2027 là 2026-HK2. Dùng làm kỳ của hóa đơn tiền phòng."
      >
        <Input id="rp-term" placeholder="2026-HK1" className="uppercase" {...form.register('term')} />
      </FormField>

      {RANGES.map(({ legend, from, to, hint }) => (
        <fieldset key={from} className="space-y-2">
          <legend className="text-sm font-medium">{legend}</legend>
          <div className="grid grid-cols-2 gap-3">
            {[from, to].map((field, i) => (
              <FormField key={field} label={i ? 'Đến ngày' : 'Từ ngày'} htmlFor={`rp-${field}`} error={err[field]?.message}>
                <Input id={`rp-${field}`} type="date" {...form.register(field)} />
              </FormField>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">{hint}</p>
        </fieldset>
      ))}

      <FormDialogFooter onCancel={onDone} isPending={save.isPending} />
    </form>
  )
}
