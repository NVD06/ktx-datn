import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate, formatMoney } from '@/lib/format'
import { invoiceStatus } from '@/lib/labels'
import type { InvoiceRef } from '@/types/invoice'
import { invoiceTitle } from '../invoice-format'

/** Danh sách hóa đơn gọn trong hợp đồng (trang của SV, drawer của người quản lý). */
export function InvoiceList({ invoices }: { invoices: InvoiceRef[] }) {
  return (
    <ul className="divide-y text-sm">
      {invoices.map((invoice) => {
        return (
          <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
            <div>
              <p className="font-medium">
                {invoice.code} · {invoiceTitle(invoice)}
              </p>
              <p className="text-muted-foreground text-xs">Hạn thanh toán {formatDate(invoice.dueDate)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium">{formatMoney(invoice.amount)}</span>
              <StatusBadge {...invoiceStatus(invoice)} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
