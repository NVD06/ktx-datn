import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Pin, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions } from '@/components/shared/RowActions'
import { SearchInput } from '@/components/shared/SearchInput'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useDialogState } from '@/hooks/useDialogState'
import { useListParams } from '@/hooks/useListParams'
import { formatDateTime } from '@/lib/format'
import type { Announcement } from '@/types/announcement'
import { AnnouncementFormDialog } from '../components/AnnouncementFormDialog'
import { useAnnouncements, useDeleteAnnouncement } from '../hooks/useAnnouncements'

/** Bảng tin cho ban quản lý: Admin đăng cho toàn KTX hoặc một tòa, Manager đăng và sửa tin của tòa mình. */
export function AnnouncementListPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const list = useListParams()
  const query = useAnnouncements(list.params)
  const remove = useDeleteAnnouncement()
  const form = useDialogState<Announcement>()
  const [deleting, setDeleting] = useState<Announcement | null>(null)
  const editable = (a: Announcement) => isAdmin || (!!a.buildingId && a.buildingId === user?.buildingId)

  const columns: ColumnDef<Announcement>[] = [
    {
      id: 'title',
      header: 'Thông báo',
      enableSorting: true,
      cell: ({ row }) => (
        <div className="max-w-md whitespace-normal">
          <p className="flex items-center gap-1.5 font-medium">
            {row.original.pinned && <Pin className="text-primary size-3.5 shrink-0" aria-label="Đã ghim" />}
            {row.original.title}
          </p>
          <p className="text-muted-foreground line-clamp-1 text-xs">{row.original.content}</p>
        </div>
      ),
    },
    {
      id: 'building',
      header: 'Gửi tới',
      cell: ({ row }) => (row.original.building ? `Tòa ${row.original.building.name}` : 'Toàn KTX'),
    },
    {
      id: 'author',
      header: 'Người đăng',
      cell: ({ row }) => row.original.author.fullName,
    },
    {
      id: 'createdAt',
      header: 'Đăng lúc',
      enableSorting: true,
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    {
      id: 'actions',
      header: '',
      meta: { className: 'w-12 text-right' },
      cell: ({ row }) =>
        editable(row.original) && (
          <RowActions
            actions={[
              { label: 'Sửa', icon: Pencil, onSelect: () => form.show(row.original) },
              { label: 'Xóa', icon: Trash2, destructive: true, onSelect: () => setDeleting(row.original) },
            ]}
          />
        ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Thông báo"
        description={
          isAdmin
            ? 'Đăng tin cho toàn ký túc xá hoặc sinh viên một tòa.'
            : 'Đăng tin cho sinh viên tòa bạn quản lý. Tin toàn KTX do quản trị viên đăng, bạn chỉ xem.'
        }
        actions={
          <Button onClick={() => form.show(null)}>
            <Plus />
            Đăng thông báo
          </Button>
        }
      />

      <DataTable
        columns={columns}
        query={query}
        list={list}
        emptyTitle="Chưa có thông báo nào"
        emptyDescription={list.search ? 'Thử bỏ bớt bộ lọc.' : 'Bấm "Đăng thông báo" để gửi tin đầu tiên.'}
        toolbar={<SearchInput value={list.search} onChange={list.setSearch} placeholder="Tìm theo tiêu đề" />}
      />

      <AnnouncementFormDialog open={form.open} onOpenChange={form.setOpen} announcement={form.item} />
      <ConfirmDialog
        target={deleting}
        onClose={() => setDeleting(null)}
        title="Xóa thông báo?"
        description={(a) => (
          <>
            Xóa <strong>{a.title}</strong>. Sinh viên sẽ không còn thấy tin này.
          </>
        )}
        confirmLabel="Xóa"
        isPending={remove.isPending}
        onConfirm={(a) => remove.mutateAsync(a.id).then(() => toast.success('Đã xóa thông báo'))}
      />
    </>
  )
}
