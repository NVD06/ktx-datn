import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DetailList } from '@/components/shared/DetailList'
import { PageHeader } from '@/components/shared/PageHeader'
import { ErrorState, LoadingState } from '@/components/shared/QueryState'
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
import { useAuth } from '@/features/auth/hooks/useAuth'
import { InvoiceDueBanner } from '@/features/invoices/components/InvoiceDueBanner'
import { bedPlace, formatDate, formatDateRange } from '@/lib/format'
import { CONTRACT_STATUS, buildingGender } from '@/lib/labels'
import type { CurrentStay } from '@/types/contract'
import { useCurrentStay, useMyContracts } from '../hooks/useContracts'

/**
 * Trang chủ của sinh viên — chỗ ở hiện tại (US-03.5): tòa/phòng/giường, bạn cùng
 * phòng, hạn hợp đồng. Có hợp đồng chờ ký thì nhắc ký ngay đầu trang.
 */
export function StudentHomePage() {
  const { user } = useAuth()
  const contracts = useMyContracts()
  const stay = useCurrentStay()
  const waiting = contracts.data?.find((c) => c.status === 'DRAFT')

  return (
    <>
      <PageHeader title="Trang cá nhân" description={`Xin chào, ${user?.fullName ?? ''}`} />

      {waiting && (
        <div className="tone-warning mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm">
          <span>
            Đơn của bạn đã được duyệt: {bedPlace(waiting.bed)}. Hợp đồng {waiting.code} đang chờ bạn ký.
          </span>
          <Button asChild size="sm">
            <Link to={`/student/contracts/${waiting.id}`}>Xem và ký</Link>
          </Button>
        </div>
      )}

      <InvoiceDueBanner />

      {stay.isPending && <LoadingState />}
      {stay.isError && <ErrorState error={stay.error} />}
      {stay.isSuccess && (stay.data ? <StayCards stay={stay.data} /> : <NoStay />)}
    </>
  )
}

function NoStay() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Chỗ ở hiện tại</CardTitle>
        <CardDescription>
          Bạn chưa có chỗ ở. Phòng và giường sẽ hiện ở đây sau khi đơn được duyệt và bạn ký hợp đồng.
        </CardDescription>
        <CardAction>
          <Button asChild variant="outline" size="sm">
            <Link to="/student/rooms">Xem chỗ trống</Link>
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  )
}

function StayCards({ stay: { contract: c, roommates } }: { stay: CurrentStay }) {
  const [now] = useState(Date.now)
  const upcoming = Date.parse(c.startDate) > now
  const { room } = c.bed

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{upcoming ? 'Chỗ ở kỳ tới' : 'Chỗ ở hiện tại'}</CardTitle>
          <CardDescription>
            Giường {c.bed.code} · Phòng {room.code} · Tòa {room.building.name}
          </CardDescription>
          <CardAction>
            <StatusBadge {...CONTRACT_STATUS[c.status]} />
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <DetailList
            rows={[
              ['Tòa nhà', `Tòa ${room.building.name} (${buildingGender(room.building.gender).label})`],
              ['Phòng', `${room.code} · Tầng ${room.floor}`],
              ['Loại phòng', `${room.roomType.name} · ${room.roomType.capacity} người`],
              ['Thời gian ở', formatDateRange(c.startDate, c.endDate)],
            ]}
          />
          {c.status === 'EXPIRED' && (
            <p className="tone-warning rounded-md border p-2 text-xs">
              Hợp đồng đã hết hạn ngày {formatDate(c.endDate)}. Liên hệ ban quản lý để gia hạn hoặc làm thủ
              tục trả phòng.
            </p>
          )}
          <Button asChild variant="outline" size="sm">
            <Link to={`/student/contracts/${c.id}`}>Xem hợp đồng {c.code}</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bạn cùng phòng</CardTitle>
          <CardDescription>
            {roommates.length > 0
              ? `${roommates.length} người khác trong phòng ${room.code}`
              : `Phòng ${room.code} chưa có ai khác.`}
          </CardDescription>
        </CardHeader>
        {roommates.length > 0 && (
          <CardContent>
            <ul className="divide-y text-sm">
              {roommates.map((m) => (
                <li key={m.bedCode} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium">{m.fullName}</p>
                    <p className="text-muted-foreground text-xs">{m.className ?? 'Chưa cập nhật lớp'}</p>
                  </div>
                  <span className="text-muted-foreground text-xs">Giường {m.bedCode}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
