import { StatusBadge } from '@/components/shared/StatusBadge'
import { isLowPriority, lowPriority } from '@/lib/labels'

export function LowPriorityBadge({ marks }: { marks: number }) {
  return isLowPriority(marks) ? <StatusBadge {...lowPriority(marks)} /> : null
}
