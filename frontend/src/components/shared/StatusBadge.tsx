import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Tone } from '@/lib/labels'

/**
 * Màu do src/styles/theme.css định nghĩa — component không giữ mã màu nào.
 * Muốn đổi sắc thái trạng thái thì sửa ở theme.css, không sửa ở đây.
 */
const TONE_CLASS: Record<Tone, string> = {
  neutral: 'tone-neutral',
  success: 'tone-success',
  warning: 'tone-warning',
  danger: 'tone-danger',
  info: 'tone-info',
}

export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <Badge variant="outline" className={cn('font-medium', TONE_CLASS[tone])}>
      {label}
    </Badge>
  )
}
