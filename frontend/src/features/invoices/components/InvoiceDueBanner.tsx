import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { formatDate, formatMoney } from '@/lib/format'
import { DUE_SOON_DAYS, isDueSoon, isOverdue } from '@/lib/labels'
import { useMyInvoices } from '../hooks/useInvoices'

/**
 * Nhắc hạn trên trang chủ sinh viên (US-04.6): hóa đơn quá hạn hoặc còn ≤ DUE_SOON_DAYS
 * ngày. Hóa đơn còn xa hạn thì không nhắc — trang Hóa đơn đã tóm tắt đủ.
 */
export function InvoiceDueBanner() {
  const invoices = useMyInvoices()

  const overdue = invoices.data?.filter(isOverdue) ?? []
  const dueSoon = invoices.data?.filter(isDueSoon) ?? []
  if (overdue.length === 0 && dueSoon.length === 0) return null

  const sum = (list: typeof overdue) => formatMoney(list.reduce((s, i) => s + Number(i.amount), 0))
  // Backend xếp hóa đơn chưa thanh toán theo hạn tăng dần — phần tử đầu là hạn gần nhất.
  const nearest = dueSoon[0]

  return (
    <div
      className={`${overdue.length ? 'tone-danger' : 'tone-warning'} mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm`}
    >
      <span className="min-w-0 flex-1">
        {overdue.length > 0 && `Bạn có ${overdue.length} hóa đơn đã quá hạn, tổng ${sum(overdue)}. `}
        {nearest &&
          `${dueSoon.length} hóa đơn sắp đến hạn trong ${DUE_SOON_DAYS} ngày tới, tổng ${sum(dueSoon)} ` +
            `(hạn gần nhất ${formatDate(nearest.dueDate)}).`}
      </span>
      <Button asChild size="sm" className="shrink-0">
        <Link to="/student/invoices">Thanh toán</Link>
      </Button>
    </div>
  )
}
