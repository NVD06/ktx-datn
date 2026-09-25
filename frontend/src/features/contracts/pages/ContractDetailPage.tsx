import { useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { BackLink } from '@/components/shared/BackLink'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DetailList } from '@/components/shared/DetailList'
import { PageHeader } from '@/components/shared/PageHeader'
import { ErrorState, LoadingState } from '@/components/shared/QueryState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatDateRange, formatDateTime, formatMoney } from '@/lib/format'
import {
  CONTRACT_STATUS,
  GENDER,
  INVOICE_STATUS,
  INVOICE_TYPE,
  OVERDUE,
  buildingGender,
} from '@/lib/labels'
import type { Contract, ContractInvoice } from '@/types/contract'
import { CONTRACT_TERMS, ROOM_FEE_DUE_DAYS } from '../contract-terms'
import { useContract, useSignContract } from '../hooks/useContracts'

const BACK = <BackLink to="/student/contracts">Hợp đồng của tôi</BackLink>

/**
 * Chi tiết hợp đồng + ký online (US-03.3). Ký xong backend làm trong một
 * transaction: hợp đồng có hiệu lực, giường có người ở, lập hóa đơn tiền phòng.
 */
export function ContractDetailPage() {
  const { id = '' } = useParams()
  const query = useContract(id)
  const sign = useSignContract()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (query.isPending) return <LoadingState />

  if (query.isError) {
    return (
      <>
        {BACK}
        <ErrorState error={query.error} />
      </>
    )
  }

  const c = query.data

  function confirmSign() {
    sign.mutate(c.id, {
      onSuccess(signed) {
        const invoice = signed.invoices[0]
        toast.success(
          `Đã ký hợp đồng ${signed.code}.` +
            (invoice
              ? ` Hóa đơn tiền phòng ${invoice.code}: ${formatMoney(invoice.amount)}, hạn ${formatDate(invoice.dueDate)}.`
              : ''),
        )
      },
      onError: (error) => toast.error(getErrorMessage(error)),
      onSettled: () => setConfirmOpen(false),
    })
  }

  return (
    <>
      {BACK}
      <PageHeader
        title={`Hợp đồng ${c.code}`}
        description={`${c.period.name} · Học kỳ ${c.period.term}`}
        actions={<StatusBadge {...CONTRACT_STATUS[c.status]} />}
      />

      <div className="space-y-4">
        <StatusNotice contract={c} />

        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Chỗ ở">
            <DetailList
              rows={[
                [
                  'Tòa nhà',
                  `Tòa ${c.bed.room.building.name} (${buildingGender(c.bed.room.building.gender).label})`,
                ],
                ['Phòng', `${c.bed.room.code} · Tầng ${c.bed.room.floor}`],
                ['Giường', c.bed.code],
                [
                  'Loại phòng',
                  `${c.bed.room.roomType.name} · ${c.bed.room.roomType.capacity} người`,
                ],
              ]}
            />
          </Section>

          <Section title="Thời hạn và chi phí">
            <DetailList
              rows={[
                ['Thời gian ở', formatDateRange(c.startDate, c.endDate), true],
                ['Tiền phòng', `${formatMoney(c.price)} / kỳ`],
                ['Hạn đóng tiền phòng', `${ROOM_FEE_DUE_DAYS} ngày kể từ ngày ký`],
                ['Ngày lập', formatDateTime(c.createdAt)],
                ['Ngày ký', c.signedAt && formatDateTime(c.signedAt)],
                ['Lý do chấm dứt', c.terminationReason, true],
              ]}
              hideEmpty
            />
          </Section>
        </div>

        <Section title="Bên thuê chỗ ở">
          <DetailList
            rows={[
              ['Họ tên', c.student.fullName],
              ['Mã sinh viên', c.student.profile?.studentCode],
              ['Giới tính', c.student.profile && GENDER[c.student.profile.gender].label],
              ['Lớp · Khoa', [c.student.profile?.className, c.student.profile?.faculty].filter(Boolean).join(' · ')],
              ['Email', c.student.email],
              ['Số điện thoại', c.student.phone],
            ]}
          />
        </Section>

        <Section title="Điều khoản">
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {CONTRACT_TERMS.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ol>
        </Section>

        {c.invoices.length > 0 && (
          <Section title="Hóa đơn">
            <ul className="divide-y text-sm">
              {c.invoices.map((invoice) => (
                <InvoiceRow key={invoice.id} invoice={invoice} />
              ))}
            </ul>
          </Section>
        )}

        {c.status === 'DRAFT' && (
          <div className="flex justify-end">
            <Button onClick={() => setConfirmOpen(true)}>Xác nhận ký</Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Ký hợp đồng?"
        description={
          <>
            Ký hợp đồng <strong>{c.code}</strong>: giường {c.bed.code} phòng {c.bed.room.code} tòa{' '}
            {c.bed.room.building.name}, tiền phòng {formatMoney(c.price)} / kỳ. Sau khi ký, hệ thống lập
            hóa đơn tiền phòng, hạn thanh toán {ROOM_FEE_DUE_DAYS} ngày.
          </>
        }
        confirmLabel="Ký hợp đồng"
        destructive={false}
        isPending={sign.isPending}
        onConfirm={confirmSign}
      />
    </>
  )
}

/** Hướng dẫn theo trạng thái — sinh viên biết ngay mình cần làm gì. */
function StatusNotice({ contract: c }: { contract: Contract }) {
  if (c.status === 'DRAFT') {
    return (
      <p className="tone-warning rounded-md border p-3 text-sm">
        Hợp đồng đang chờ bạn ký. Đọc kỹ thông tin và điều khoản bên dưới, rồi bấm "Xác nhận ký" ở
        cuối trang.
      </p>
    )
  }
  if (c.status === 'EXPIRED' && !c.signedAt) {
    return (
      <p className="tone-danger rounded-md border p-3 text-sm">
        Hợp đồng đã quá thời gian ở mà chưa được ký nên không còn ký được. Liên hệ ban quản lý nếu
        bạn vẫn cần chỗ ở.
      </p>
    )
  }
  return null
}

function InvoiceRow({ invoice }: { invoice: ContractInvoice }) {
  // Quá hạn tính khi đọc, không lưu trong DB (us-04.md, US-04.3).
  const overdue = invoice.status === 'UNPAID' && new Date(invoice.dueDate) < new Date()
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
      <div>
        <p className="font-medium">
          {invoice.code} · {INVOICE_TYPE[invoice.type].label} {invoice.period}
        </p>
        <p className="text-muted-foreground text-xs">Hạn thanh toán {formatDate(invoice.dueDate)}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-medium">{formatMoney(invoice.amount)}</span>
        <StatusBadge {...(overdue ? OVERDUE : INVOICE_STATUS[invoice.status])} />
      </div>
    </li>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
