import { Badge } from '@/components/ui/badge'
import { TONE_CLASS, type Tone } from '@/lib/labels'
import { cn } from '@/lib/utils'

/**
 * Màu do src/styles/theme.css định nghĩa — component không giữ mã màu nào.
 * Muốn đổi sắc thái trạng thái thì sửa ở theme.css, không sửa ở đây.
 *
 * Nhận thẳng một mục của lib/labels.ts: `<StatusBadge {...REGISTRATION_STATUS[r.status]} />`.
 */
export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <Badge variant="outline" className={cn('font-medium', TONE_CLASS[tone])}>
      {label}
    </Badge>
  )
}
