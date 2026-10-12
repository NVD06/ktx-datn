import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { MoneyTotal } from '@/types/invoice'
export function MoneyTotalText({ total, danger }: { total: MoneyTotal; danger?: boolean }) {
  if (total.count === 0) return <span className="text-muted-foreground">{formatMoney(0)}</span>
  return (
    <span className="tabular-nums">
      <span className={cn(danger && 'text-destructive')}>{formatMoney(total.amount)}</span>
      <span className="text-muted-foreground ml-1 text-xs">({total.count})</span>
    </span>
  )
}