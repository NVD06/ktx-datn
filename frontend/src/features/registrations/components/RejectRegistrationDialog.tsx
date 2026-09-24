import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { getErrorCode } from '@/api/client'
import { FormDialog, FormDialogFooter } from '@/components/shared/FormDialog'
import { FormField } from '@/components/shared/FormField'
import { Textarea } from '@/components/ui/textarea'
import { showFormError } from '@/lib/form'
import type { RegistrationListItem } from '@/types/registration'
import { useRejectRegistration } from '../hooks/useRegistrations'

// Giữ khớp với backend/src/modules/registrations/registration.schema.ts.
const schema = z.object({
  reviewNote: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập lý do từ chối')
    .max(500, 'Lý do từ chối tối đa 500 ký tự'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  /** Đơn đang từ chối; null = đóng. */
  registration: RegistrationListItem | null
  onClose: () => void
}

/** Từ chối đơn (US-03.1) — bắt buộc lý do, sinh viên đọc được trong "Đơn của tôi". */
export function RejectRegistrationDialog({ registration, onClose }: Props) {
  return (
    <FormDialog
      open={!!registration}
      onOpenChange={(open) => !open && onClose()}
      title="Từ chối đơn đăng ký"
      description={
        registration
          ? `Đơn của ${registration.student.fullName}, đợt ${registration.period.name}. ` +
            'Sinh viên thấy lý do trong "Đơn của tôi" và vẫn nộp lại được trong đợt.'
          : ''
      }
    >
      {registration && <RejectForm registration={registration} onDone={onClose} />}
    </FormDialog>
  )
}

function RejectForm({ registration, onDone }: { registration: RegistrationListItem; onDone: () => void }) {
  const reject = useRejectRegistration()
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { reviewNote: '' } })

  function onSubmit({ reviewNote }: FormValues) {
    reject.mutate(
      { id: registration.id, reviewNote },
      {
        onSuccess() {
          toast.success(`Đã từ chối đơn của ${registration.student.fullName}`)
          onDone()
        },
        onError(error) {
          showFormError(form, error)
          // Người khác vừa duyệt/từ chối đơn này — không còn gì để làm ở đây.
          if (getErrorCode(error) === 'REGISTRATION_NOT_PENDING') onDone()
        },
      },
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField
        label="Lý do từ chối"
        htmlFor="rj-note"
        error={form.formState.errors.reviewNote?.message}
      >
        <Textarea
          id="rj-note"
          rows={4}
          placeholder="Ví dụ: tòa đã hết chỗ cho loại phòng bạn chọn…"
          {...form.register('reviewNote')}
        />
      </FormField>

      <FormDialogFooter
        onCancel={onDone}
        isPending={reject.isPending}
        submitLabel="Từ chối đơn"
        pendingLabel="Đang gửi…"
      />
    </form>
  )
}
