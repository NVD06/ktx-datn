import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormDialog, FormDialogFooter } from '@/components/shared/FormDialog'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { showFormError } from '@/lib/form'
import { useCreateMaintenanceRequest } from '../hooks/useMaintenance'

// Giữ khớp với backend/src/modules/maintenance/maintenance.schema.ts.
const schema = z.object({
  title: z.string().trim().min(1, 'Vui lòng nhập tiêu đề').max(150, 'Tiêu đề tối đa 150 ký tự'),
  description: z.string().trim().min(1, 'Vui lòng nhập mô tả').max(2000, 'Mô tả tối đa 2000 ký tự'),
})

type FormValues = z.infer<typeof schema>

/** Sinh viên gửi yêu cầu sửa chữa cho phòng đang ở — chỉ chữ, không có ảnh. */
export function MaintenanceFormDialog({
  open,
  onOpenChange,
  roomLabel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** "Phòng 103 · Tòa B1" — phòng do hệ thống lấy từ hợp đồng, sinh viên không chọn. */
  roomLabel: string
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Gửi yêu cầu sửa chữa"
      description={`${roomLabel}. Mô tả rõ hư hỏng để ban quản lý chuẩn bị đúng người, đúng đồ.`}
    >
      <MaintenanceForm onDone={() => onOpenChange(false)} />
    </FormDialog>
  )
}

function MaintenanceForm({ onDone }: { onDone: () => void }) {
  const create = useCreateMaintenanceRequest()
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { title: '', description: '' } })
  const { errors } = form.formState

  function onSubmit(values: FormValues) {
    create.mutate(values, {
      onSuccess() {
        toast.success('Đã gửi yêu cầu — theo dõi tiến độ ngay trên trang này')
        onDone()
      },
      onError: (error) => showFormError(form, error),
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField label="Tiêu đề" htmlFor="mr-title" error={errors.title?.message}>
        <Input id="mr-title" placeholder="Ví dụ: Vòi nước nhà vệ sinh bị rỉ" {...form.register('title')} />
      </FormField>
      <FormField label="Mô tả" htmlFor="mr-description" error={errors.description?.message}>
        <Textarea
          id="mr-description"
          rows={5}
          placeholder="Hư hỏng ở đâu, từ khi nào, đã thử xử lý gì…"
          {...form.register('description')}
        />
      </FormField>
      <FormDialogFooter onCancel={onDone} isPending={create.isPending} submitLabel="Gửi yêu cầu" pendingLabel="Đang gửi…" />
    </form>
  )
}
