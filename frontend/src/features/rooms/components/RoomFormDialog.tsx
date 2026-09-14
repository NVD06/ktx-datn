import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router-dom'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useRoomTypeOptions } from '@/features/room-types/hooks/useRoomTypes'
import { formatMoney } from '@/lib/format'
import { showFormError } from '@/lib/form'
import type { Building, Room } from '@/types/facility'
import { useSaveRoom } from '../hooks/useRooms'

// Giữ khớp với backend/src/modules/rooms/room.schema.ts. Tầng tối đa phụ thuộc tòa nên schema tạo theo tòa.
function makeSchema(maxFloor: number) {
  return z.object({
    code: z
      .string()
      .trim()
      .min(1, 'Mã phòng không được để trống')
      .max(20, 'Mã phòng tối đa 20 ký tự')
      .regex(/^[A-Za-z0-9._-]+$/, 'Mã phòng chỉ gồm chữ không dấu, số và các ký tự . _ -'),
    floor: z
      .number('Vui lòng nhập tầng')
      .int('Tầng phải là số nguyên')
      .min(1, 'Tầng phải từ 1 trở lên')
      .max(maxFloor, `Tòa nhà chỉ có ${maxFloor} tầng`),
    roomTypeId: z.string().min(1, 'Vui lòng chọn loại phòng'),
    isActive: z.boolean(),
  })
}

type FormValues = z.infer<ReturnType<typeof makeSchema>>

type RoomBuilding = Pick<Building, 'id' | 'name' | 'floors'>
type EditableRoom = Pick<Room, 'id' | 'code' | 'floor' | 'roomTypeId' | 'isActive' | 'bedCount'>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  building: RoomBuilding
  /** Có = sửa, không có = thêm mới. */
  room?: EditableRoom | null
}

export function RoomFormDialog({ open, onOpenChange, building, room }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{room ? `Sửa phòng ${room.code}` : 'Thêm phòng'}</DialogTitle>
          <DialogDescription>
            Tòa {building.name} · {building.floors} tầng
          </DialogDescription>
        </DialogHeader>
        <RoomForm building={building} room={room} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function RoomForm({
  building,
  room,
  onDone,
}: {
  building: RoomBuilding
  room?: EditableRoom | null
  onDone: () => void
}) {
  const save = useSaveRoom()
  const roomTypes = useRoomTypeOptions()
  const schema = useMemo(() => makeSchema(building.floors), [building.floors])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: room
      ? { code: room.code, floor: room.floor, roomTypeId: room.roomTypeId, isActive: room.isActive }
      : { code: '', floor: 1, roomTypeId: '', isActive: true },
  })
  const err = form.formState.errors
  const roomTypeId = useWatch({ control: form.control, name: 'roomTypeId' })

  const types = roomTypes.data?.data ?? []
  // Loại phòng ngừng sử dụng không chọn được cho phòng mới, trừ loại phòng đang gắn với chính phòng này.
  const selectable = types.filter((t) => t.isActive || t.id === room?.roomTypeId)
  const selectedType = types.find((t) => t.id === roomTypeId)

  function onSubmit(values: FormValues) {
    save.mutate(
      { id: room?.id, input: { ...values, buildingId: building.id } },
      {
        onSuccess(saved) {
          toast.success(
            room
              ? `Đã cập nhật phòng ${saved.code}`
              : `Đã thêm phòng ${saved.code} với ${saved.bedCount} giường`,
          )
          onDone()
        },
        onError: (error) => showFormError(form, error),
      },
    )
  }

  let typeHint: string | undefined
  if (selectedType) {
    typeHint = room
      ? `Sức chứa ${selectedType.capacity} giường · phòng đang có ${room.bedCount} giường`
      : `Tự tạo ${selectedType.capacity} giường (G1–G${selectedType.capacity})`
    typeHint += ` · ${formatMoney(selectedType.price)} / kỳ`
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Mã phòng" htmlFor="room-code" error={err.code?.message}>
          <Input id="room-code" placeholder="301" {...form.register('code')} />
        </FormField>
        <FormField label="Tầng" htmlFor="room-floor" error={err.floor?.message}>
          <Input
            id="room-floor"
            type="number"
            min={1}
            max={building.floors}
            {...form.register('floor', { valueAsNumber: true })}
          />
        </FormField>
      </div>

      <FormField
        label="Loại phòng"
        htmlFor="room-type"
        error={err.roomTypeId?.message}
        hint={typeHint}
      >
        {roomTypes.isSuccess && selectable.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Chưa có loại phòng đang sử dụng.{' '}
            <Link to="/admin/room-types" className="text-foreground underline underline-offset-4">
              Tạo loại phòng
            </Link>
          </p>
        ) : (
          <Controller
            control={form.control}
            name="roomTypeId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="room-type"
                  className="w-full"
                  aria-invalid={!!err.roomTypeId}
                  disabled={roomTypes.isPending}
                >
                  <SelectValue placeholder={roomTypes.isPending ? 'Đang tải…' : 'Chọn loại phòng'} />
                </SelectTrigger>
                <SelectContent position="popper">
                  {selectable.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                      {!t.isActive && ' (ngừng sử dụng)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}
      </FormField>

      {room && (
        <Controller
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={field.value} onCheckedChange={field.onChange} />
              Đang hoạt động
              <span className="text-muted-foreground text-xs">— tắt để ẩn khỏi danh sách phòng còn chỗ</span>
            </label>
          )}
        />
      )}

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
