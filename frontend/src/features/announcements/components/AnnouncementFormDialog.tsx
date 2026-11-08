import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormDialog, FormDialogFooter } from '@/components/shared/FormDialog'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useBuildings } from '@/features/buildings/hooks/useBuildings'
import { showFormError } from '@/lib/form'
import type { Announcement } from '@/types/announcement'
import { useSaveAnnouncement } from '../hooks/useAnnouncements'

const BUILDING_PARAMS = { limit: 100, sortBy: 'name', order: 'asc' } as const
const ALL = 'all'

const schema = z.object({
  title: z.string().trim().min(1, 'Vui lòng nhập tiêu đề').max(150, 'Tiêu đề tối đa 150 ký tự'),
  content: z.string().trim().min(1, 'Vui lòng nhập nội dung').max(5000, 'Nội dung tối đa 5000 ký tự'),
  target: z.string(),
  pinned: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export function AnnouncementFormDialog({
  open,
  onOpenChange,
  announcement,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  announcement: Announcement | null
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={announcement ? 'Sửa thông báo' : 'Đăng thông báo'}
      description="Sinh viên đọc ở mục Thông báo, tin chưa đọc có dấu trên menu."
    >
      <AnnouncementForm announcement={announcement} onDone={() => onOpenChange(false)} />
    </FormDialog>
  )
}

function AnnouncementForm({ announcement, onDone }: { announcement: Announcement | null; onDone: () => void }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const buildings = useBuildings(BUILDING_PARAMS)
  const save = useSaveAnnouncement()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: announcement?.title ?? '',
      content: announcement?.content ?? '',
      target: announcement?.buildingId ?? ALL,
      pinned: announcement?.pinned ?? false,
    },
  })
  const err = form.formState.errors
  const own = buildings.data?.data.find((b) => b.id === user?.buildingId)

  function onSubmit({ target, ...values }: FormValues) {
    save.mutate(
      { id: announcement?.id, input: { ...values, buildingId: target === ALL ? null : target } },
      {
        onSuccess() {
          toast.success(announcement ? 'Đã cập nhật thông báo' : 'Đã đăng thông báo')
          onDone()
        },
        onError: (error) => showFormError(form, error),
      },
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField label="Tiêu đề" htmlFor="an-title" error={err.title?.message}>
        <Input id="an-title" placeholder="Tạm ngừng cấp nước sáng thứ Bảy" {...form.register('title')} />
      </FormField>
      <FormField label="Nội dung" htmlFor="an-content" error={err.content?.message}>
        <Textarea id="an-content" rows={6} {...form.register('content')} />
      </FormField>
      <FormField label="Gửi tới">
        {isAdmin ? (
          <Controller
            control={form.control}
            name="target"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full" aria-label="Gửi tới">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={ALL}>Toàn ký túc xá</SelectItem>
                  {buildings.data?.data.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      Sinh viên tòa {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        ) : (
          <p className="text-sm">Sinh viên tòa {own?.name ?? 'bạn quản lý'}</p>
        )}
      </FormField>
      <Controller
        control={form.control}
        name="pinned"
        render={({ field }) => (
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={field.value} onCheckedChange={field.onChange} />
            Ghim lên đầu
            <span className="text-muted-foreground text-xs">— cho tin quan trọng</span>
          </label>
        )}
      />
      <FormDialogFooter onCancel={onDone} isPending={save.isPending} submitLabel={announcement ? 'Lưu' : 'Đăng'} />
    </form>
  )
}
