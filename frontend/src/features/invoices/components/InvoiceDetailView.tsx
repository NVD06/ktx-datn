import { DetailList, DetailSection } from '@/components/shared/DetailList'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatDateTime, formatMoney, orDash } from '@/lib/format'
import { INVOICE_ITEM_TYPE, PAYMENT_STATUS } from '@/lib/labels'
import type { InvoiceDetail, InvoicePayment } from '@/types/invoice'
import { invoiceTitle, quantityLabel } from '../invoice-format'

/**
 * Nội dung chi tiết hóa đơn (US-04.3): thông tin chung, các dòng (chỉ số, số lượng,
 * đơn giá, thành tiền) và lịch sử thanh toán. Hiển thị trong InvoiceDetailSheet.
 */
export function InvoiceDetailView({ invoice: i }: { invoice: InvoiceDetail }) {
  const { student, bed } = i.contract

  return (
    <div className="space-y-6">
      <DetailSection title="Thông tin">
        <DetailList
          rows={[
            ['Loại', invoiceTitle(i)],
            ['Hạn thanh toán', formatDate(i.dueDate)],
            ['Sinh viên', `${student.fullName}${student.profile ? ` · ${student.profile.studentCode}` : ''}`],
            ['Chỗ ở', `Giường ${bed.code} · Phòng ${bed.room.code} · Tòa ${bed.room.building.name}`],
            ['Hợp đồng', i.contract.code],
            ['Ngày lập', formatDateTime(i.createdAt)],
            ['Người lập', i.createdBy?.fullName ?? (i.type === 'ROOM_FEE' ? 'Hệ thống tự lập' : '—')],
          ]}
        />
      </DetailSection>

      <DetailSection title="Chi tiết">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Khoản</TableHead>
              <TableHead>Chỉ số</TableHead>
              <TableHead className="text-right">Số lượng</TableHead>
              <TableHead className="text-right">Đơn giá</TableHead>
              <TableHead className="text-right">Thành tiền</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {i.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{INVOICE_ITEM_TYPE[item.type].label}</TableCell>
                <TableCell>{item.oldIndex === null ? '—' : `${item.oldIndex} → ${item.newIndex}`}</TableCell>
                <TableCell className="text-right">{quantityLabel(item, i.period)}</TableCell>
                <TableCell className="text-right">{formatMoney(item.unitPrice)}</TableCell>
                <TableCell className="text-right">{formatMoney(item.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4} className="font-medium">
                Tổng cộng
              </TableCell>
              <TableCell className="text-right font-medium">{formatMoney(i.amount)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        {!!i.splitCount && (
          <p className="text-muted-foreground text-xs">
            Điện, nước tính theo chỉ số của cả phòng rồi chia đều cho {i.splitCount} sinh viên đang ở — cột "Thành tiền"
            là phần của sinh viên này.
          </p>
        )}
      </DetailSection>

      <DetailSection title="Lịch sử thanh toán">
        <PaymentHistory payments={i.payments} />
      </DetailSection>
    </div>
  )
}

export function PaymentHistory({ payments }: { payments: InvoicePayment[] }) {
  if (payments.length === 0) return <p className="text-muted-foreground text-sm">Chưa có giao dịch nào.</p>
  return (
    <ul className="divide-y text-sm">
      {payments.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
          <div>
            <p className="font-medium">{formatMoney(p.amount)}</p>
            <p className="text-muted-foreground text-xs">
              {formatDateTime(p.paidAt ?? p.createdAt)} · Mã GD VNPay {orDash(p.vnpTransactionNo)}
            </p>
          </div>
          <StatusBadge {...PAYMENT_STATUS[p.status]} />
        </li>
      ))}
    </ul>
  )
}
