import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'

/** Ô số liệu tóm tắt ở đầu trang chi tiết. */
export function StatCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card size="sm">
      <CardContent className="space-y-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        <div className="text-base font-semibold">{children}</div>
      </CardContent>
    </Card>
  )
}
