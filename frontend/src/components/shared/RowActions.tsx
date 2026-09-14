import { Ellipsis, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface RowAction {
  label: string
  icon?: LucideIcon
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
}

/** Menu "…" ở cột cuối của bảng (convention.md §8.5). */
export function RowActions({ actions }: { actions: RowAction[] }) {
  if (actions.length === 0) return null

  return (
    // modal={false}: menu modal giữ `pointer-events: none` trên body khi mở
    // dialog ngay từ một mục menu, làm cả trang không bấm được.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Thao tác">
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map(({ label, icon: Icon, onSelect, destructive, disabled }) => (
          <DropdownMenuItem
            key={label}
            variant={destructive ? 'destructive' : 'default'}
            disabled={disabled}
            onSelect={onSelect}
          >
            {Icon && <Icon />}
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
