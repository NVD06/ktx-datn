import { BedSingle, CircleCheck, Trash2, Wrench } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/QueryState'
import { RowActions, type RowAction } from '@/components/shared/RowActions'
import { BED_STATUS, TONE_CLASS } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { Bed } from '@/types/facility'
import { useDeleteBed, useUpdateBed } from '../hooks/useRooms'

/**
 * Sơ đồ giường trong phòng — mỗi ô một giường, tô màu theo trạng thái.
 *
 * Chỉ đổi tay được AVAILABLE ↔ MAINTENANCE. Giường OCCUPIED do hợp đồng quản lý
 * nên không có thao tác nào (backend cũng chặn bằng 409).
 */
export function BedGrid({ beds }: { beds: Bed[] }) {
  const update = useUpdateBed()
  const remove = useDeleteBed()
  const [deleting, setDeleting] = useState<Bed | null>(null)

  function setStatus(bed: Bed, status: 'AVAILABLE' | 'MAINTENANCE') {
    update.mutate(
      { id: bed.id, input: { status } },
      {
        onSuccess: () =>
          toast.success(
            status === 'MAINTENANCE'
              ? `Đã chuyển giường ${bed.code} sang bảo trì`
              : `Giường ${bed.code} đã sẵn sàng sử dụng`,
          ),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  function confirmDelete() {
    if (!deleting) return
    const { id, code } = deleting
    remove.mutate(id, {
      onSuccess: () => toast.success(`Đã xóa giường ${code}`),
      onError: (error) => toast.error(getErrorMessage(error)),
      onSettled: () => setDeleting(null),
    })
  }

  if (beds.length === 0) {
    return (
      <EmptyState
        title="Phòng chưa có giường"
        description="Bấm “Thêm giường” để tạo giường cho phòng này."
      />
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {beds.map((bed) => {
          const occupied = bed.status === 'OCCUPIED'
          const actions: RowAction[] = occupied
            ? []
            : [
                bed.status === 'AVAILABLE'
                  ? {
                      label: 'Chuyển sang bảo trì',
                      icon: Wrench,
                      onSelect: () => setStatus(bed, 'MAINTENANCE'),
                    }
                  : {
                      label: 'Đưa vào sử dụng',
                      icon: CircleCheck,
                      onSelect: () => setStatus(bed, 'AVAILABLE'),
                    },
                {
                  label: 'Xóa giường',
                  icon: Trash2,
                  destructive: true,
                  onSelect: () => setDeleting(bed),
                },
              ]

          return (
            <div
              key={bed.id}
              className={cn('flex min-h-24 flex-col gap-2 rounded-xl border p-3', TONE_CLASS[BED_STATUS[bed.status].tone])}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BedSingle className="size-5" />
                  <span className="text-lg font-semibold">{bed.code}</span>
                </div>
                <RowActions actions={actions} />
              </div>
              <p className="text-sm font-medium">{BED_STATUS[bed.status].label}</p>
              {occupied && <p className="text-xs opacity-80">Đổi qua hợp đồng</p>}
            </div>
          )
        })}
      </div>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Xóa giường?"
        description={
          <>
            Xóa giường <strong>{deleting?.code}</strong>. Giường đã từng có hợp đồng sẽ không xóa được
            — khi đó hãy chuyển sang bảo trì.
          </>
        }
        isPending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </>
  )
}
