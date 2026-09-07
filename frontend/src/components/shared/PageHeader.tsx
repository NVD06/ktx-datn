import type { ReactNode } from 'react'

interface Props {
  title: string
  description?: string
  /** Nút hành động chính, canh phải — ví dụ "Thêm tòa nhà". */
  actions?: ReactNode
}

/**
 * Đầu trang chuẩn cho mọi màn hình trong khu quản trị và khu sinh viên.
 * Dùng component này thay vì tự dựng <h1> ở từng trang, để khoảng cách và
 * cỡ chữ luôn giống nhau.
 */
export function PageHeader({ title, description, actions }: Props) {
  return (
    <div className="border-primary mb-6 flex items-start justify-between gap-4 border-b-2 pb-3">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
