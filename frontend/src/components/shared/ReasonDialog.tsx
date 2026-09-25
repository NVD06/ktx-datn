import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { getErrorCode } from '@/api/client'
import { FormDialog, FormDialogFooter } from '@/components/shared/FormDialog'
import { FormField } from '@/components/shared/FormField'
import { Textarea } from '@/components/ui/textarea'
import { showFormError } from '@/lib/form'

interface Props<T> {
  /** Bản ghi đang thao tác; null = đóng. */
  target: T | null
  onClose: () => void
  title: string
  description: (target: T) => string
  /** "Lý do từ chối" — cũng dùng để dựng câu báo lỗi, giống `requiredText` ở backend. */
  label: string
  placeholder: string
  submitLabel: string
  isPending: boolean
  /** Gửi lý do: resolve thì đóng dialog, reject thì hiện lỗi. */
  onSubmit: (target: T, reason: string) => Promise<unknown>
  /** Lỗi mang mã này nghĩa là người khác vừa xử lý xong bản ghi — đóng luôn, không còn gì để làm. */
  closeOnErrorCode: string
}

/**
 * Dialog nhập lý do bắt buộc (tối đa 500 ký tự) trước một thao tác không hoàn tác:
 * từ chối đơn, từ chối ký hợp đồng, hủy hợp đồng chờ ký.
 */
export function ReasonDialog<T>({ target, onClose, title, description, ...rest }: Props<T>) {
  return (
    <FormDialog
      open={!!target}
      onOpenChange={(open) => !open && onClose()}
      title={title}
      description={target ? description(target) : ''}
    >
      {target && <ReasonForm target={target} onClose={onClose} {...rest} />}
    </FormDialog>
  )
}

function ReasonForm<T>({
  target,
  onClose,
  label,
  placeholder,
  submitLabel,
  isPending,
  onSubmit,
  closeOnErrorCode,
}: Omit<Props<T>, 'title' | 'description' | 'target'> & { target: T }) {
  // Giữ khớp với requiredText(label, 500) ở backend/src/utils/zod-fields.ts.
  const schema = z.object({
    reason: z
      .string()
      .trim()
      .min(1, `Vui lòng nhập ${label.toLowerCase()}`)
      .max(500, `${label} tối đa 500 ký tự`),
  })
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { reason: '' } })

  function submit({ reason }: z.infer<typeof schema>) {
    onSubmit(target, reason).then(onClose, (error: unknown) => {
      showFormError(form, error)
      if (getErrorCode(error) === closeOnErrorCode) onClose()
    })
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-4" noValidate>
      <FormField label={label} htmlFor="reason" error={form.formState.errors.reason?.message}>
        <Textarea id="reason" rows={4} placeholder={placeholder} {...form.register('reason')} />
      </FormField>
      <FormDialogFooter onCancel={onClose} isPending={isPending} submitLabel={submitLabel} pendingLabel="Đang gửi…" />
    </form>
  )
}
