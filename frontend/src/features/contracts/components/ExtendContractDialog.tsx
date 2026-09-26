import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormDialog, FormDialogFooter } from '@/components/shared/FormDialog'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/ui/input'
import { fromDateInput, toDateInput } from '@/lib/date-input'
import { formatDate, formatMoney } from '@/lib/format'
import { showFormError } from '@/lib/form'
import type { Contract } from '@/types/contract'
import { ROOM_FEE_DUE_DAYS } from '../contract-terms'
import { extensionFee } from '../contract-actions'
import { useExtendContract } from '../hooks/useContracts'

const DAY_MS = 24 * 60 * 60 * 1000

/** Hôm nay dạng "YYYY-MM-DD" — lấy một lần khi mở form. */
function todayInput() {
  return toDateInput(new Date().toISOString())
}

interface Props {
  /** Hợp đồng đang gia hạn; null = đóng. */
  contract: Contract | null
  onClose: () => void
}

/**
 * Gia hạn hợp đồng đang ở (US-03.4). Hệ thống lập hóa đơn tiền phòng cho số ngày ở
 * thêm (chốt 25/09, phương án B) — số tiền hiện ngay khi chọn ngày để Manager thấy trước.
 */
export function ExtendContractDialog({ contract, onClose }: Props) {
  return (
    <FormDialog
      open={!!contract}
      onOpenChange={(open) => !open && onClose()}
      title="Gia hạn hợp đồng"
      description={
        contract
          ? `Hợp đồng ${contract.code} của ${contract.student.fullName}, hiện kết thúc ngày ` +
            `${formatDate(contract.endDate)}. Giường giữ nguyên, số ngày ở thêm được lập hóa đơn tiền phòng.`
          : ''
      }
    >
      {contract && <ExtendForm contract={contract} onDone={onClose} />}
    </FormDialog>
  )
}

function ExtendForm({ contract: c, onDone }: { contract: Contract; onDone: () => void }) {
  const extend = useExtendContract()

  // Sớm nhất: ngày sau ngày kết thúc hiện tại, và không trước hôm nay (backend kiểm tra lại).
  const [today] = useState(todayInput)
  const dayAfterEnd = toDateInput(new Date(Date.parse(c.endDate) + DAY_MS).toISOString())
  const minDate = dayAfterEnd > today ? dayAfterEnd : today
  const schema = z.object({
    endDate: z
      .string()
      .min(1, 'Vui lòng chọn ngày kết thúc mới')
      .refine((v) => v >= minDate, `Chọn từ ngày ${formatDate(fromDateInput(minDate))} trở đi`),
  })
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { endDate: '' } })
  const endDate = useWatch({ control: form.control, name: 'endDate' })
  const fee = endDate >= minDate ? extensionFee(c, fromDateInput(endDate, 'end')) : null

  function onSubmit(values: z.infer<typeof schema>) {
    extend.mutate(
      { id: c.id, endDate: fromDateInput(values.endDate, 'end') },
      {
        onSuccess(updated) {
          const invoice = updated.invoices[updated.invoices.length - 1]
          toast.success(
            `Đã gia hạn ${updated.code} đến ngày ${formatDate(updated.endDate)}` +
              (invoice ? `. Hóa đơn ${invoice.code}: ${formatMoney(invoice.amount)}` : ''),
          )
          onDone()
        },
        onError: (error) => showFormError(form, error),
      },
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField
        label="Ngày kết thúc mới"
        htmlFor="ext-end"
        error={form.formState.errors.endDate?.message}
        hint="Tính hết ngày đã chọn."
      >
        <Input id="ext-end" type="date" min={minDate} {...form.register('endDate')} />
      </FormField>

      {fee && (
        <p className="bg-muted/50 rounded-md border p-3 text-sm">
          Hóa đơn tiền phòng gia hạn:{' '}
          <span className="font-medium">
            {fee.days} ngày × {formatMoney(fee.dailyRate)} = {formatMoney(fee.amount)}
          </span>
          , hạn thanh toán {ROOM_FEE_DUE_DAYS} ngày.
        </p>
      )}

      <FormDialogFooter onCancel={onDone} isPending={extend.isPending} submitLabel="Gia hạn" />
    </form>
  )
}
