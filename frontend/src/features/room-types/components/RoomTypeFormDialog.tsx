import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { formatMoney } from '@/lib/format'
import { showFormError } from '@/lib/form'
import type { RoomType } from '@/types/facility'
import { useSaveRoomType } from '../hooks/useRoomTypes'

// Giữ khớp với backend/src/modules/room-types/room-type.schema.ts.
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tên loại phòng không được để trống')
    .max(100, 'Tên loại phòng tối đa 100 ký tự'),
  capacity: z
    .number('Vui lòng nhập số giường')
    .int('Số giường phải là số nguyên')
    .min(1, 'Tối thiểu 1 giường')
    .max(20, 'Tối đa 20 giường'),
  price: z
    .number('Vui lòng nhập giá')
    .int('Giá phải là số nguyên')
    .min(0, 'Giá không được âm')
    .max(100_000_000, 'Giá tối đa là 100.000.000 đ'),
  description: z.string().max(500, 'Mô tả tối đa 500 ký tự'),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Có = sửa, không có = thêm mới. */
  roomType?: RoomType | null
}

export function RoomTypeFormDialog({ open, onOpenChange, roomType }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{roomType ? 'Sửa loại phòng' : 'Thêm loại phòng'}</DialogTitle>
          <DialogDescription>Danh mục dùng chung cho mọi tòa nhà.</DialogDescription>
        </DialogHeader>
        {/* Form nằm trong DialogContent nên được tạo mới mỗi lần mở — không cần reset tay. */}
        <RoomTypeForm roomType={roomType} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function RoomTypeForm({ roomType, onDone }: { roomType?: RoomType | null; onDone: () => void }) {
  const save = useSaveRoomType()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: roomType
      ? {
          name: roomType.name,
          capacity: roomType.capacity,
          price: Number(roomType.price),
          description: roomType.description ?? '',
          isActive: roomType.isActive,
        }
      : { name: '', capacity: 4, price: 0, description: '', isActive: true },
  })
  const price = useWatch({ control: form.control, name: 'price' })
  const err = form.formState.errors

  function onSubmit(values: FormValues) {
    const input = { ...values, description: values.description.trim() || null }
    save.mutate(
      { id: roomType?.id, input },
      {
        onSuccess() {
          toast.success(roomType ? 'Đã cập nhật loại phòng' : 'Đã thêm loại phòng')
          onDone()
        },
        onError: (error) => showFormError(form, error),
      },
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField label="Tên loại phòng" htmlFor="rt-name" error={err.name?.message}>
        <Input id="rt-name" placeholder="Phòng 4 giường - điều hòa" {...form.register('name')} />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField
          label="Sức chứa (giường)"
          htmlFor="rt-capacity"
          error={err.capacity?.message}
          hint={
            roomType
              ? 'Không nhỏ hơn số giường của phòng đang dùng loại này'
              : 'Số giường tự tạo khi thêm phòng'
          }
        >
          <Input
            id="rt-capacity"
            type="number"
            min={1}
            max={20}
            {...form.register('capacity', { valueAsNumber: true })}
          />
        </FormField>

        <FormField
          label="Giá một kỳ / sinh viên"
          htmlFor="rt-price"
          error={err.price?.message}
          hint={formatMoney(price)}
        >
          <Input
            id="rt-price"
            type="number"
            min={0}
            step={50_000}
            {...form.register('price', { valueAsNumber: true })}
          />
        </FormField>
      </div>

      <p className="tone-info rounded-md border p-2.5 text-xs">
        Đổi giá chỉ áp dụng cho hợp đồng tạo sau. Hợp đồng đã ký giữ nguyên giá tại thời điểm ký.
      </p>

      <FormField label="Mô tả" htmlFor="rt-description" error={err.description?.message}>
        <Textarea id="rt-description" rows={3} {...form.register('description')} />
      </FormField>

      <Controller
        control={form.control}
        name="isActive"
        render={({ field }) => (
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={field.value} onCheckedChange={field.onChange} />
            Đang sử dụng
            <span className="text-muted-foreground text-xs">— tắt để không chọn được cho phòng mới</span>
          </label>
        )}
      />

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
