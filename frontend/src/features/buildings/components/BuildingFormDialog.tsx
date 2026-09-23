import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormDialog, FormDialogFooter } from '@/components/shared/FormDialog'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { showFormError } from '@/lib/form'
import { GENDER, MIXED_GENDER } from '@/lib/labels'
import type { Building } from '@/types/facility'
import { useSaveBuilding } from '../hooks/useBuildings'

// Giữ khớp với backend/src/modules/buildings/building.schema.ts.
// Select không nhận giá trị null nên tòa hỗn hợp tạm dùng 'MIXED', đổi lại khi gửi đi.
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tên tòa nhà không được để trống')
    .max(50, 'Tên tòa nhà tối đa 50 ký tự'),
  floors: z
    .number('Vui lòng nhập số tầng')
    .int('Số tầng phải là số nguyên')
    .min(1, 'Tòa nhà phải có ít nhất 1 tầng')
    .max(50, 'Số tầng tối đa là 50'),
  gender: z.enum(['MALE', 'FEMALE', 'MIXED']),
  description: z.string().max(500, 'Mô tả tối đa 500 ký tự'),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Có = sửa, không có = thêm mới. */
  building?: Building | null
}

export function BuildingFormDialog({ open, onOpenChange, building }: Props) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={building ? `Sửa tòa nhà ${building.name}` : 'Thêm tòa nhà'}
      description="Phòng thêm vào tòa chỉ được đặt ở tầng không vượt quá số tầng."
    >
      <BuildingForm building={building} onDone={() => onOpenChange(false)} />
    </FormDialog>
  )
}

function BuildingForm({ building, onDone }: { building?: Building | null; onDone: () => void }) {
  const save = useSaveBuilding()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: building
      ? {
          name: building.name,
          floors: building.floors,
          gender: building.gender ?? 'MIXED',
          description: building.description ?? '',
          isActive: building.isActive,
        }
      : { name: '', floors: 5, gender: 'MIXED', description: '', isActive: true },
  })
  const err = form.formState.errors

  function onSubmit(values: FormValues) {
    const input = {
      ...values,
      gender: values.gender === 'MIXED' ? null : values.gender,
      description: values.description.trim() || null,
    }
    save.mutate(
      { id: building?.id, input },
      {
        onSuccess() {
          toast.success(building ? 'Đã cập nhật tòa nhà' : `Đã thêm tòa nhà ${input.name}`)
          onDone()
        },
        onError: (error) => showFormError(form, error),
      },
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Tên tòa nhà" htmlFor="b-name" error={err.name?.message}>
          <Input id="b-name" placeholder="B3" {...form.register('name')} />
        </FormField>

        <FormField
          label="Số tầng"
          htmlFor="b-floors"
          error={err.floors?.message}
          hint={building ? 'Không nhỏ hơn tầng cao nhất đang có phòng' : undefined}
        >
          <Input
            id="b-floors"
            type="number"
            min={1}
            max={50}
            {...form.register('floors', { valueAsNumber: true })}
          />
        </FormField>
      </div>

      <FormField label="Giới tính ở" htmlFor="b-gender" error={err.gender?.message}>
        <Controller
          control={form.control}
          name="gender"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="b-gender" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="MALE">Tòa {GENDER.MALE.label.toLowerCase()}</SelectItem>
                <SelectItem value="FEMALE">Tòa {GENDER.FEMALE.label.toLowerCase()}</SelectItem>
                <SelectItem value="MIXED">{MIXED_GENDER.label}</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <FormField label="Mô tả" htmlFor="b-description" error={err.description?.message}>
        <Textarea id="b-description" rows={3} {...form.register('description')} />
      </FormField>

      <Controller
        control={form.control}
        name="isActive"
        render={({ field }) => (
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={field.value} onCheckedChange={field.onChange} />
            Đang hoạt động
            <span className="text-muted-foreground text-xs">— tắt để không thêm được phòng mới</span>
          </label>
        )}
      />

      <FormDialogFooter onCancel={onDone} isPending={save.isPending} />
    </form>
  )
}
