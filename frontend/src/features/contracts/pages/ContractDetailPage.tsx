import { useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BackLink } from '@/components/shared/BackLink'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DetailList } from '@/components/shared/DetailList'
import { PageHeader } from '@/components/shared/PageHeader'
import { ReasonDialog } from '@/components/shared/ReasonDialog'
import { ErrorState, LoadingState } from '@/components/shared/QueryState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { bedPlace, formatDate, formatDateRange, formatDateTime, formatMoney } from '@/lib/format'
import { CONTRACT_STATUS, GENDER } from '@/lib/labels'
import type { Contract } from '@/types/contract'
import { CONTRACT_TERMS, ROOM_FEE_DUE_DAYS, ROOM_FEE_RULE } from '../contract-terms'
import { useContract, useEndContract, useSignContract } from '../hooks/useContracts'

const BACK = <BackLink to="/student/contracts">Hợp đồng của tôi</BackLink>

/**
 * Chi tiết hợp đồng + ký online (US-03.3). Ký xong backend làm trong một
 * transaction: hợp đồng có hiệu lực, giường có người ở, có ngay hóa đơn tiền phòng
 * tháng đầu (tính từ ngày ký). Hóa đơn chỉ xem ở trang Hóa đơn, trang này không liệt kê.
 */
export function ContractDetailPage() {
  const { id = '' } = useParams()
  const query = useContract(id)
  const sign = useSignContract()
  const decline = useEndContract('decline')
  const [signing, setSigning] = useState(false)
  const [declining, setDeclining] = useState(false)

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

  async function confirmSign(contract: Contract) {
    const signed = await sign.mutateAsync(contract.id)
    toast.success(`Đã ký hợp đồng ${signed.code}. Hóa đơn tiền phòng tháng đầu đã được lập, xem ở mục Hóa đơn.`)
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
                  `Tòa ${c.bed.room.building.name} (${GENDER[c.bed.room.building.gender].label})`,
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
                ['Tiền phòng', `${formatMoney(c.price)} / tháng`],
                ['Thanh toán tiền phòng', `Trả trước hằng tháng, hạn ${ROOM_FEE_DUE_DAYS} ngày từ ngày lập hóa đơn`],
                ['Ngày lập', formatDateTime(c.createdAt)],
                ['Ngày ký', c.signedAt && formatDateTime(c.signedAt)],
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

        {c.status === 'DRAFT' && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeclining(true)}>
              Từ chối ký
            </Button>
            <Button onClick={() => setSigning(true)}>Xác nhận ký</Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        target={signing ? c : null}
        onClose={() => setSigning(false)}
        title="Ký hợp đồng?"
        description={(k) => (
          <>
            Ký hợp đồng <strong>{k.code}</strong>: {bedPlace(k.bed)}, tiền phòng {formatMoney(k.price)} / tháng,
            tính từ ngày ký. {ROOM_FEE_RULE}
          </>
        )}
        confirmLabel="Ký hợp đồng"
        destructive={false}
        isPending={sign.isPending}
        onConfirm={confirmSign}
      />

      <ReasonDialog
        target={declining ? c : null}
        onClose={() => setDeclining(false)}
        title="Từ chối ký hợp đồng?"
        description={(contract) =>
          `Từ chối hợp đồng ${contract.code} (${bedPlace(contract.bed)}). Giường được trả lại cho người khác, ` +
          'đơn đăng ký chuyển sang "Đã hủy" — bạn vẫn nộp lại được nếu đợt còn mở.'
        }
        label="Lý do từ chối"
        placeholder="Ví dụ: em đã tìm được chỗ ở gần trường hơn…"
        submitLabel="Từ chối ký"
        isPending={decline.isPending}
        closeOnErrorCode="CONTRACT_NOT_DRAFT"
        onSubmit={(contract, reason) =>
          decline
            .mutateAsync({ id: contract.id, reason })
            .then(() => toast.success(`Đã từ chối hợp đồng ${contract.code}`))
        }
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
        cuối trang. Nếu không muốn ở nữa, bấm "Từ chối ký" để giường được trả lại cho người khác.
      </p>
    )
  }
  if (c.status === 'CANCELLED') {
    const byStudent = c.endedBy?.role === 'STUDENT'
    return (
      <p className="bg-muted/50 rounded-md border p-3 text-sm">
        Hợp đồng đã hủy ngày {formatDate(c.terminatedAt)} —{' '}
        {byStudent ? 'bạn đã từ chối ký' : 'ban quản lý đã hủy hợp đồng'}. Lý do: {c.terminationReason}
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
