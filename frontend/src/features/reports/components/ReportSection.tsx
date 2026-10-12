import type { ReactNode } from 'react'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Một khối số liệu trong trang báo cáo: tiêu đề, mô tả, thao tác riêng của khối (bộ lọc) ở góc
 * phải. Thao tác chỉ áp cho khối đó thì đặt ở đây, áp cho cả trang thì đặt trên đầu trang.
 */
export function ReportSection({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
