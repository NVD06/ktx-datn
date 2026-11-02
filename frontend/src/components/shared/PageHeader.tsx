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
 *
 * Từ `md` trở lên đầu trang dính ở đỉnh màn hình khi cuộn, nút hành động luôn trong tầm tay.
 * Nền phủ lên phần đệm phía trên (24px của <main> khi là phần tử đầu, 16px dưới BackLink khi
 * có) nên lúc chưa cuộn vị trí không đổi, lúc dính vẫn còn khoảng thở ở trên. Điện thoại
 * không dính: đã có thanh trên cố định, dính thêm thì chiếm quá nhiều chỗ.
 */
export function PageHeader({ title, description, actions }: Props) {
  return (
    <div className="border-primary bg-background mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b-2 pb-3 md:sticky md:top-0 md:z-10 md:first:-mt-6 md:first:pt-6 md:not-first:-mt-4 md:not-first:pt-4 lg:flex-nowrap">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 lg:shrink-0">{actions}</div>}
    </div>
  )
}
