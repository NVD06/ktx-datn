import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

/** Liên kết quay về trang cha, đặt ngay trên PageHeader của trang chi tiết. */
export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-sm"
    >
      <ChevronLeft className="size-4" />
      {children}
    </Link>
  )
}
