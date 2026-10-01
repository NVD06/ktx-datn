import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PaginationMeta } from '@/types/api'

/** Cuối bảng: đang xem dòng nào, chuyển trang. Số dòng mỗi trang chọn ở hàng bộ lọc (PageSizeSelect). */
export function Pagination({
  meta,
  onPageChange,
}: {
  meta: PaginationMeta
  onPageChange: (page: number) => void
}) {
  const pageCount = Math.max(1, Math.ceil(meta.total / meta.limit))
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1
  const to = Math.min(meta.page * meta.limit, meta.total)

  return (
    <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm">
      <span>{meta.total === 0 ? 'Không có kết quả' : `Hiển thị ${from}–${to} trên ${meta.total}`}</span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          <ChevronLeft />
          Trước
        </Button>
        <span className="tabular-nums">
          Trang {meta.page}/{pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page >= pageCount}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Sau
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
