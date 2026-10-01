import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/QueryState'
import { Card, CardContent } from '@/components/ui/card'
import { useDialogState } from '@/hooks/useDialogState'
import { formatMoney } from '@/lib/format'
import { isOverdue } from '@/lib/labels'
import { InvoiceDetailSheet } from '../components/InvoiceDetailSheet'
import { InvoiceList } from '../components/InvoiceList'
import { useMyInvoices } from '../hooks/useInvoices'

/**
 * Hóa đơn của sinh viên (US-04.3) — backend đã xếp chưa thanh toán lên đầu (hạn
 * gần nhất trước); đầu trang tóm tắt số tiền còn phải trả.
 */
export function MyInvoicesPage() {
  const invoices = useMyInvoices()
  const detail = useDialogState<string>()

  const unpaid = invoices.data?.filter((i) => i.status === 'UNPAID') ?? []
  const overdue = unpaid.filter(isOverdue).length
  const total = unpaid.reduce((sum, i) => sum + Number(i.amount), 0)

  return (
    <>
      <PageHeader title="Hóa đơn của tôi" description="Tiền phòng và tiền điện nước theo từng tháng." />

      {unpaid.length > 0 && (
        <p className={`${overdue > 0 ? 'tone-danger' : 'tone-warning'} mb-4 rounded-md border p-3 text-sm`}>
          Bạn còn {unpaid.length} hóa đơn chưa thanh toán, tổng {formatMoney(total)}
          {overdue > 0 && `, trong đó ${overdue} hóa đơn đã quá hạn`}.
        </p>
      )}

      {invoices.isPending && <LoadingState />}
      {invoices.isError && <ErrorState error={invoices.error} />}
      {invoices.data?.length === 0 && (
        <EmptyState title="Chưa có hóa đơn nào" description="Hóa đơn tiền phòng tháng đầu được lập khi bạn ký hợp đồng, các tháng sau vào ngày 1 hằng tháng." />
      )}
      {invoices.data && invoices.data.length > 0 && (
        <Card>
          <CardContent>
            <InvoiceList invoices={invoices.data} onSelect={detail.show} />
          </CardContent>
        </Card>
      )}

      <InvoiceDetailSheet invoiceId={detail.item} open={detail.open} onOpenChange={detail.setOpen} />
    </>
  )
}
