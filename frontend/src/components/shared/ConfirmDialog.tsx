import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Props<T> {
  /** Bản ghi đang chờ xác nhận; null = đóng. */
  target: T | null
  onClose: () => void
  title: string
  /** Mô tả phải nêu rõ tên bản ghi — convention.md §8.4. */
  description: (target: T) => ReactNode
  confirmLabel?: string
  /** `false` cho thao tác đảo lại được (mở đợt, mở khóa…) — nút xác nhận không tô đỏ. */
  destructive?: boolean
  isPending: boolean
  /** Gọi API và tự báo thành công. Xong thì đóng; lỗi thì báo bằng toast rồi đóng. */
  onConfirm: (target: T) => Promise<unknown>
}

/** Hộp xác nhận trước thao tác không hoàn tác được (xóa, khóa, ký…) — cùng kiểu với ReasonDialog. */
export function ConfirmDialog<T>({
  target,
  onClose,
  title,
  description,
  confirmLabel = 'Xóa',
  destructive = true,
  isPending,
  onConfirm,
}: Props<T>) {
  return (
    <AlertDialog open={!!target} onOpenChange={(open) => !open && !isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{target && description(target)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? 'destructive' : 'default'}
            disabled={isPending}
            onClick={(e) => {
              // Giữ dialog mở tới khi API trả lời — mặc định Action đóng ngay khi bấm.
              e.preventDefault()
              if (!target) return
              onConfirm(target)
                .catch((error: unknown) => toast.error(getErrorMessage(error)))
                .finally(onClose)
            }}
          >
            {isPending ? 'Đang xử lý…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
