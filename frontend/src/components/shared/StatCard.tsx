import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Ô số liệu tóm tắt ở đầu trang. Truyền `onClick` thì ô thành nút lọc nhanh,
 * `active` đánh dấu ô đang được chọn. `hint` là dòng giải thích nhỏ dưới con số.
 */
export function StatCard({
  label,
  children,
  hint,
  active,
  onClick,
}: {
  label: string
  children: ReactNode
  hint?: ReactNode
  active?: boolean
  onClick?: () => void
}) {
  const card = (
    <Card
      size="sm"
      className={cn('h-full', onClick && 'hover:bg-accent/50 transition-colors', active && 'ring-primary ring-2')}
    >
      <CardContent className="space-y-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        <div className="text-base font-semibold">{children}</div>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </CardContent>
    </Card>
  )
  if (!onClick) return card

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="focus-visible:ring-ring rounded-xl text-left outline-none focus-visible:ring-2"
    >
      {card}
    </button>
  )
}
