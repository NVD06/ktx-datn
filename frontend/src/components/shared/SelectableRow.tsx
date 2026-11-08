import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function SelectableRow({
  active,
  onClick,
  className,
  children,
}: {
  active: boolean
  onClick: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'hover:bg-accent/60 flex w-full gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
        active && 'bg-accent',
        className,
      )}
    >
      {children}
    </button>
  )
}
