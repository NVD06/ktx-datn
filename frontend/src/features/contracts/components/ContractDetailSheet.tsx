import { DetailList, DetailSection, type DetailRow } from '@/components/shared/DetailList'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { formatDateRange, formatDateTime, formatMoney } from '@/lib/format'
import { CONTRACT_STATUS, GENDER, ROLE } from '@/lib/labels'
import type { Contract } from '@/types/contract'
import { canCancel } from '../contract-actions'
import { InvoiceList } from './InvoiceList'

/**
 * Chi tiết hợp đồng cho người quản lý (US-03.4). Dữ liệu lấy sẵn từ dòng của
 * bảng, không gọi API riêng. `contract` tách khỏi `open` để nội dung còn nguyên
 * trong lúc drawer trượt ra.
 */
export function ContractDetailSheet({
  contract: c,
  open,
  onOpenChange,
  onCancel,
}: {
  contract: Contract | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCancel: (contract: Contract) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto data-[side=right]:sm:max-w-md">
        {c && <Content contract={c} />}
        {c && canCancel(c) && (
          <SheetFooter className="border-t sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onCancel(c)}>
              Hủy hợp đồng chờ ký
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Content({ contract: c }: { contract: Contract }) {
  const profile = c.student.profile

  const contractRows: DetailRow[] = [
    ['Đợt', `${c.period.name} · ${c.period.term}`, true],
    ['Chỗ ở', `Giường ${c.bed.code} · Phòng ${c.bed.room.code} · Tầng ${c.bed.room.floor} · Tòa ${c.bed.room.building.name}`, true],
    ['Loại phòng', c.bed.room.roomType.name],
    ['Tiền phòng', `${formatMoney(c.price)} / kỳ`],
    ['Thời gian ở', formatDateRange(c.startDate, c.endDate), true],
    ['Ngày lập', formatDateTime(c.createdAt)],
    ['Ngày ký', c.signedAt && formatDateTime(c.signedAt)],
  ]

  const endRows: DetailRow[] = c.terminatedAt
    ? [
        ['Ngày hủy / chấm dứt', formatDateTime(c.terminatedAt)],
        ['Người thực hiện', c.endedBy && `${c.endedBy.fullName} (${ROLE[c.endedBy.role].label})`],
        ['Lý do', c.terminationReason, true],
      ]
    : []

  const studentRows: DetailRow[] = [
    ['Mã sinh viên', profile?.studentCode],
    ['Giới tính', profile && GENDER[profile.gender].label],
    ['Lớp', profile?.className],
    ['Khoa', profile?.faculty],
    ['Email', c.student.email],
    ['Số điện thoại', c.student.phone],
  ]

  return (
    <>
      <SheetHeader className="border-b pr-12">
        <SheetTitle>Hợp đồng {c.code}</SheetTitle>
        <SheetDescription>{c.student.fullName}</SheetDescription>
        <div className="pt-2">
          <StatusBadge {...CONTRACT_STATUS[c.status]} />
        </div>
      </SheetHeader>

      <div className="space-y-6 px-4 pb-6">
        <DetailSection title="Hợp đồng">
          <DetailList rows={contractRows} hideEmpty />
        </DetailSection>
        {endRows.length > 0 && (
          <DetailSection title={c.status === 'CANCELLED' ? 'Đã hủy' : 'Đã chấm dứt'}>
            <DetailList rows={endRows} hideEmpty />
          </DetailSection>
        )}
        <DetailSection title="Sinh viên">
          <DetailList rows={studentRows} />
        </DetailSection>
        {c.invoices.length > 0 && (
          <DetailSection title="Hóa đơn">
            <InvoiceList invoices={c.invoices} />
          </DetailSection>
        )}
      </div>
    </>
  )
}
