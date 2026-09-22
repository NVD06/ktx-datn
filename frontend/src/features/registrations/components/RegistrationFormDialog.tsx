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
import { Textarea } from '@/components/ui/textarea'
import { formatMoney } from '@/lib/format'
import { showFormError } from '@/lib/form'
import { buildingGender } from '@/lib/labels'
import type { AvailableSummary } from '@/types/facility'
import { useCreateRegistration } from '../hooks/useRegistrations'

// Giữ khớp với backend/src/modules/registrations/registration.schema.ts.
const schema = z.object({
  note: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  /** Dòng tòa × loại phòng được bấm "Đăng ký" ở trang chỗ trống; null = đóng. */
  target: AvailableSummary | null
  onClose: () => void
  periodName: string
}

/** Nộp đơn với nguyện vọng là tòa × loại phòng đã chọn — sinh viên chỉ thêm ghi chú. */
export function RegistrationFormDialog({ target, onClose, periodName }: Props) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nộp đơn đăng ký ở</DialogTitle>
          <DialogDescription>
            Đợt {periodName}. Nguyện vọng giúp ban quản lý xếp giường, không đảm bảo được xếp đúng.
          </DialogDescription>
        </DialogHeader>
        {/* Form nằm trong DialogContent nên được tạo mới mỗi lần mở — không cần reset tay. */}
        {target && <RegistrationForm target={target} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function RegistrationForm({ target, onDone }: { target: AvailableSummary; onDone: () => void }) {
  const create = useCreateRegistration()
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { note: '' } })
  const { building, roomType } = target

  function onSubmit({ note }: FormValues) {
    create.mutate(
      { buildingId: building.id, preferredRoomTypeId: roomType.id, note: note || null },
      {
        onSuccess() {
          toast.success('Đã nộp đơn — theo dõi kết quả ở mục "Đơn của tôi"')
          onDone()
        },
        onError: (error) => showFormError(form, error),
      },
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <dl className="bg-muted/50 grid grid-cols-2 gap-3 rounded-md border p-3 text-sm">
        <div>
          <dt className="text-muted-foreground text-xs">Tòa nhà</dt>
          <dd className="font-medium">
            Tòa {building.name} ({buildingGender(building.gender).label})
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Loại phòng</dt>
          <dd className="font-medium">
            {roomType.name} — {formatMoney(roomType.price)} / kỳ
          </dd>
        </div>
      </dl>

      <FormField label="Ghi chú" htmlFor="rg-note" error={form.formState.errors.note?.message}>
        <Textarea
          id="rg-note"
          rows={3}
          placeholder="Ví dụ: muốn ở cùng phòng với bạn…"
          {...form.register('note')}
        />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={create.isPending}>
          Hủy
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Đang nộp…' : 'Nộp đơn'}
        </Button>
      </DialogFooter>
    </form>
  )
}
