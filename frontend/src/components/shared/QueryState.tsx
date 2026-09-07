import type { ReactNode } from 'react'
import { getErrorMessage } from '@/api/client'

/**
 * Ba trạng thái mà màn hình dữ liệu nào cũng phải xử lý: đang tải, lỗi, rỗng.
 * Trước đây mỗi trang tự viết một kiểu — gom lại để chữ nghĩa và khoảng cách
 * đồng nhất.
 */

export function LoadingState({ label = 'Đang tải…' }: { label?: string }) {
  return <p className="text-muted-foreground py-8 text-center text-sm">{label}</p>
}

export function ErrorState({ error }: { error: unknown }) {
  return (
    <p className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
      {getErrorMessage(error)}
    </p>
  )
}

export function EmptyState({
  title = 'Chưa có dữ liệu',
  description,
  action,
}: {
  title?: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center">
      <p className="font-medium">{title}</p>
      {description && <p className="text-muted-foreground text-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/** Dùng khi cả trang chưa quyết định được hiển thị gì — ví dụ route guard đang chờ /auth/me. */
export function FullPageLoading() {
  return (
    <div className="text-muted-foreground flex min-h-svh items-center justify-center text-sm">
      Đang tải…
    </div>
  )
}
