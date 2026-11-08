import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormDialog, FormDialogFooter } from '@/components/shared/FormDialog'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { showFormError } from '@/lib/form'
import type { DormRule } from '@/types/dorm-rule'
import { useSaveDormRule } from '../hooks/useDormRules'

const schema = z.object({
  title: z.string().trim().min(1, 'Vui lòng nhập tiêu đề').max(100, 'Tiêu đề tối đa 100 ký tự'),
  content: z.string().trim().min(1, 'Vui lòng nhập nội dung').max(3000, 'Nội dung tối đa 3000 ký tự'),
  sortOrder: z.number('Vui lòng nhập thứ tự').int('Thứ tự là số nguyên').min(1, 'Thứ tự từ 1 trở lên').max(999, 'Thứ tự tối đa 999'),
})

type FormValues = z.infer<typeof schema>

export function DormRuleFormDialog({
  open,
  onOpenChange,
  rule,
  nextOrder,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule: DormRule | null
  nextOrder: number
  onSaved: (id: string) => void
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={rule ? 'Sửa mục nội quy' : 'Thêm mục nội quy'}
      description="Sinh viên xem ở trang Thông báo. Mỗi dòng của nội dung là một quy định."
    >
      <DormRuleForm rule={rule} nextOrder={nextOrder} onSaved={onSaved} onDone={() => onOpenChange(false)} />
    </FormDialog>
  )
}

function DormRuleForm({
  rule,
  nextOrder,
  onSaved,
  onDone,
}: {
  rule: DormRule | null
  nextOrder: number
  onSaved: (id: string) => void
  onDone: () => void
}) {
  const save = useSaveDormRule()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: rule?.title ?? '',
      content: rule?.content ?? '',
      sortOrder: rule?.sortOrder ?? nextOrder,
    },
  })
  const err = form.formState.errors
  function onSubmit(input: FormValues) {
    save.mutate(
      { id: rule?.id, input },
      {
        onSuccess(saved) {
          toast.success(rule ? 'Đã cập nhật nội quy' : 'Đã thêm mục nội quy')
          onSaved(saved.id)
          onDone()
        },
        onError: (error) => showFormError(form, error),
      },
    )
  }
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
        <FormField label="Tiêu đề" htmlFor="dr-title" error={err.title?.message}>
          <Input id="dr-title" placeholder="Giờ giấc" {...form.register('title')} />
        </FormField>
        <FormField label="Thứ tự" htmlFor="dr-order" error={err.sortOrder?.message}>
          <Input id="dr-order" type="number" min={1} {...form.register('sortOrder', { valueAsNumber: true })} />
        </FormField>
      </div>
      <FormField label="Nội dung" htmlFor="dr-content" error={err.content?.message}>
        <Textarea
          id="dr-content"
          rows={8}
          placeholder={'Mỗi dòng một quy định, ví dụ:\nGiữ trật tự sau 22h.\nKhách về trước 21h.'}
          {...form.register('content')}
        />
      </FormField>
      <FormDialogFooter onCancel={onDone} isPending={save.isPending} submitLabel={rule ? 'Lưu' : 'Thêm'} />
    </form>
  )
}
