import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate, formatMoney } from '@/lib/format'
import { INVOICE_TYPE, invoiceStatus } from '@/lib/labels'
import type { InvoiceRef } from '@/types/invoice'

/**
 * Danh sách hóa đơn gọn — trong hợp đồng (trang của SV, drawer của người quản lý)
 * và trang "Hóa đơn của tôi". Có `onSelect` thì bấm vào tên hóa đơn để xem chi tiết.
 */
export function InvoiceList({ invoices, onSelect }: { invoices: InvoiceRef[]; onSelect?: (id: string) => void }) {
  return (
    <ul className="divide-y text-sm">
      {invoices.map((invoice) => {
        const title = `${invoice.code} · ${INVOICE_TYPE[invoice.type].label} ${invoice.period}`
        return (
          <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
            <div>
              {onSelect ? (
                <button
                  type="button"
                  className="font-medium underline-offset-4 hover:underline"
                  onClick={() => onSelect(invoice.id)}
                >
                  {title}
                </button>
              ) : (
                <p className="font-medium">{title}</p>
              )}
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
