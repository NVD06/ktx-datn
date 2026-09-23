import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * Khung dialog của form thêm/sửa (convention.md §8). Form đặt trong `children`
 * nằm trong DialogContent nên được tạo mới mỗi lần mở — không cần reset tay.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  children: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

/** Nút Hủy + Lưu ở cuối form trong FormDialog — đặt bên trong `<form>`. */
export function FormDialogFooter({
  onCancel,
  isPending,
  submitLabel = 'Lưu',
  pendingLabel = 'Đang lưu…',
}: {
  onCancel: () => void
  isPending: boolean
  submitLabel?: string
  pendingLabel?: string
}) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
        Hủy
      </Button>
      <Button type="submit" disabled={isPending}>
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </DialogFooter>
  )
}
