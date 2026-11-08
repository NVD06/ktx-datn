import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/QueryState'
import { SelectableRow } from '@/components/shared/SelectableRow'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate, formatDateTime, formatMoney } from '@/lib/format'
import { INVOICE_ITEM_TYPE, invoiceStatus, isOverdue } from '@/lib/labels'
import type { Invoice, InvoiceDetail, InvoiceItem } from '@/types/invoice'
import { PaymentHistory } from '../components/InvoiceDetailView'
import { useInvoice, useMyInvoices, usePayInvoice } from '../hooks/useInvoices'
import { invoiceTitle, quantityLabel } from '../invoice-format'

/**
 * Hóa đơn của sinh viên (US-04.3, US-04.4): danh sách bên trái — backend đã xếp chưa thanh toán
 * lên đầu, hạn gần nhất trước; bên phải là chi tiết hóa đơn đang chọn và nút thanh toán VNPay.
 */
export function MyInvoicesPage() {
  const invoices = useMyInvoices()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const unpaid = invoices.data?.filter((i) => i.status === 'UNPAID') ?? []
  const overdue = unpaid.filter(isOverdue).length
  const total = unpaid.reduce((sum, i) => sum + Number(i.amount), 0)
  const selected = invoices.data?.find((i) => i.id === selectedId) ?? invoices.data?.[0]
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
      {selected && invoices.data && (
        <div className="grid items-start gap-4 lg:grid-cols-[23rem_minmax(0,1fr)]">
          <Card className="py-2">
            <CardContent className="space-y-1 px-2">
              {invoices.data.map((i) => (
                <SelectableRow
                  key={i.id}
                  active={i.id === selected.id}
                  onClick={() => setSelectedId(i.id)}
                  className="items-start justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{invoiceTitle(i)}</p>
                    <p className="text-muted-foreground truncate text-xs">{i.code}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-semibold tabular-nums">{formatMoney(i.amount)}</span>
                    <StatusBadge {...invoiceStatus(i)} />
                  </div>
                </SelectableRow>
              ))}
            </CardContent>
          </Card>
          <InvoicePanel invoice={selected} />
        </div>
      )}
    </>
  )
}

function InvoicePanel({ invoice }: { invoice: Invoice }) {
  const detail = useInvoice(invoice.id)
  const { room } = invoice.contract.bed
  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Hóa đơn {invoiceTitle(invoice)}</h2>
            <p className="text-muted-foreground text-xs">
              {invoice.code} · Phòng {room.code} · Tòa {room.building.name} · lập ngày {formatDate(invoice.createdAt)}
            </p>
          </div>
          <StatusBadge {...invoiceStatus(invoice)} />
        </div>
        {detail.isPending && <LoadingState />}
        {detail.isError && <ErrorState error={detail.error} />}
        {detail.data && (
          <>
            <ul className="divide-y border-y">
              {detail.data.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{INVOICE_ITEM_TYPE[item.type].label}</p>
                    <p className="text-muted-foreground text-xs">{itemHint(item, detail.data)}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{formatMoney(item.amount)}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Tổng cộng</span>
              <span className="text-2xl font-bold tabular-nums">{formatMoney(invoice.amount)}</span>
            </div>
            <PaymentNote invoice={detail.data} />
            {detail.data.payments.length > 0 && (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium">Lịch sử thanh toán</p>
                <PaymentHistory payments={detail.data.payments} />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function itemHint(item: InvoiceItem, invoice: InvoiceDetail) {
  if (item.type === 'ROOM_FEE') return `Giường ${invoice.contract.bed.code} · ${quantityLabel(item, invoice.period)}`
  const split = invoice.splitCount && invoice.splitCount > 1 ? ` ÷ ${invoice.splitCount} người` : ''
  return `Chỉ số ${item.oldIndex} → ${item.newIndex} = ${quantityLabel(item, invoice.period)} × ${formatMoney(item.unitPrice)}${split}`
}

function PaymentNote({ invoice }: { invoice: InvoiceDetail }) {
  const pay = usePayInvoice()
  if (invoice.status === 'PAID') {
    const paidAt = invoice.payments.find((p) => p.status === 'SUCCESS')?.paidAt
    return (
      <p className="tone-success rounded-lg border p-3 text-sm">
        Đã thanh toán{paidAt && ` lúc ${formatDateTime(paidAt)}`}. Cảm ơn bạn!
      </p>
    )
  }
  const overdue = isOverdue(invoice)
  return (
    <div
      className={`${overdue ? 'tone-danger' : 'tone-warning'} flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm`}
    >
      <p className="min-w-0 flex-1">
        {overdue ? 'Đã quá hạn thanh toán ' : 'Hạn thanh toán '}
        <strong>{formatDate(invoice.dueDate)}</strong>. Thanh toán trực tuyến qua VNPay, trạng thái cập nhật tự động
        sau khi giao dịch thành công.
      </p>
      <Button disabled={pay.isPending} onClick={() => pay.mutate(invoice.id)} className="shrink-0">
        {pay.isPending ? 'Đang chuyển sang VNPay…' : `Thanh toán ${formatMoney(invoice.amount)}`}
      </Button>
    </div>
  )
}
