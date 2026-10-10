import { formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Thanh lấp đầy: giường có người trên tổng giường, kèm phần trăm bên phải. */
export function OccupancyBar({ occupied, total, className }: { occupied: number; total: number; className?: string }) {
  const percent = total ? (occupied / total) * 100 : 0

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        role="progressbar"
        aria-label="Tỷ lệ lấp đầy"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        className="bg-muted h-2 min-w-16 flex-1 overflow-hidden rounded-full"
      >
        <div className="bg-primary h-full rounded-full" style={{ width: `${percent}%` }} />
      </div>
      <span className="w-12 text-right text-xs tabular-nums">{formatPercent(occupied, total)}</span>
    </div>
  )
}
