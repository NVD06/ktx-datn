import { Link } from 'react-router-dom'
import { DetailList } from '@/components/shared/DetailList'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/QueryState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatDate, formatDateRange, formatMoney } from '@/lib/format'
import { CONTRACT_STATUS } from '@/lib/labels'
import type { Contract } from '@/types/contract'
import { useMyContracts } from '../hooks/useContracts'

/** Hợp đồng của sinh viên (US-03.3): mỗi kỳ ở một hợp đồng, hợp đồng chờ ký có nút vào ký. */
export function MyContractsPage() {
  const contracts = useMyContracts()

  return (
    <>
      <PageHeader
        title="Hợp đồng của tôi"
        description="Hợp đồng được lập khi đơn đăng ký được duyệt. Ký online để nhận chỗ ở."
      />

      {contracts.isPending && <LoadingState />}
      {contracts.isError && <ErrorState error={contracts.error} />}
      {contracts.data?.length === 0 && (
        <EmptyState
          title="Bạn chưa có hợp đồng nào"
          description="Hợp đồng sẽ xuất hiện ở đây khi đơn đăng ký của bạn được duyệt."
          action={
            <Button asChild variant="outline">
              <Link to="/student/registrations">Xem đơn của tôi</Link>
            </Button>
          }
        />
      )}

      {contracts.data && contracts.data.length > 0 && (
        <div className="space-y-3">
          {contracts.data.map((c) => (
            <ContractCard key={c.id} contract={c} />
          ))}
        </div>
      )}
    </>
  )
}

function ContractCard({ contract: c }: { contract: Contract }) {
  const { bed } = c
  const waiting = c.status === 'DRAFT'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Hợp đồng {c.code}</CardTitle>
        <CardDescription>
          {c.period.name} · Học kỳ {c.period.term}
        </CardDescription>
        <CardAction>
          <StatusBadge {...CONTRACT_STATUS[c.status]} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <DetailList
          rows={[
            ['Chỗ ở', `Giường ${bed.code} · Phòng ${bed.room.code} · Tòa ${bed.room.building.name}`],
            ['Thời gian ở', formatDateRange(c.startDate, c.endDate)],
            ['Tiền phòng', `${formatMoney(c.price)} / kỳ`],
            ['Ngày ký', c.signedAt && formatDate(c.signedAt)],
          ]}
          hideEmpty
        />

        {waiting && (
          <p className="text-muted-foreground text-xs">
            Giường được giữ cho bạn trong lúc chờ ký. Ký càng sớm càng tốt để nhận chỗ ở.
          </p>
        )}

        <div className="flex justify-end">
          <Button asChild size="sm" variant={waiting ? 'default' : 'outline'}>
            <Link to={`/student/contracts/${c.id}`}>{waiting ? 'Xem và ký' : 'Xem chi tiết'}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
