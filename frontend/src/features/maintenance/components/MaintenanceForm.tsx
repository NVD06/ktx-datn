import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
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

/** Sinh viên gửi yêu cầu sửa chữa cho phòng đang ở — chỉ chữ, không có ảnh; phòng lấy từ hợp đồng. */
export function MaintenanceForm({ roomLabel, onCreated }: { roomLabel: string; onCreated: () => void }) {
  const create = useCreateMaintenanceRequest()
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { title: '', description: '' } })
  const { errors } = form.formState
  function onSubmit(values: FormValues) {
    create.mutate(values, {
      onSuccess() {
        toast.success('Đã gửi yêu cầu — theo dõi tiến độ ngay trên trang này')
        form.reset()
        onCreated()
      },
      onError: (error) => showFormError(form, error),
    })
  }
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField label="Phòng" htmlFor="mr-room">
        <Input id="mr-room" value={roomLabel} disabled />
      </FormField>
      <FormField label="Tiêu đề" htmlFor="mr-title" error={errors.title?.message}>
        <Input id="mr-title" placeholder="Ví dụ: Ổ cắm cạnh bàn học giường 2" {...form.register('title')} />
      </FormField>
      <FormField label="Mô tả sự cố" htmlFor="mr-description" error={errors.description?.message}>
        <Textarea
          id="mr-description"
          rows={5}
          placeholder="Mô tả ngắn gọn tình trạng, thời điểm phát hiện, đã thử xử lý gì…"
          {...form.register('description')}
        />
      </FormField>
      <Button type="submit" className="w-full" disabled={create.isPending}>
        {create.isPending ? 'Đang gửi…' : 'Gửi yêu cầu'}
      </Button>
    </form>
  )
}
