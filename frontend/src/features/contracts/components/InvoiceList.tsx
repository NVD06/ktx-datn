import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate, formatMoney } from '@/lib/format'
import { INVOICE_TYPE, invoiceStatus } from '@/lib/labels'
import type { ContractInvoice } from '@/types/contract'

/** Hóa đơn của một hợp đồng — trang hợp đồng của SV và drawer của người quản lý. */
export function InvoiceList({ invoices }: { invoices: ContractInvoice[] }) {
  return (
    <ul className="divide-y text-sm">
      {invoices.map((invoice) => (
        <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
          <div>
            <p className="font-medium">
              {invoice.code} · {INVOICE_TYPE[invoice.type].label} {invoice.period}
            </p>
            <p className="text-muted-foreground text-xs">Hạn thanh toán {formatDate(invoice.dueDate)}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-medium">{formatMoney(invoice.amount)}</span>
            <StatusBadge {...invoiceStatus(invoice)} />
          </div>
        </li>
      ))}
    </ul>
  )
}
