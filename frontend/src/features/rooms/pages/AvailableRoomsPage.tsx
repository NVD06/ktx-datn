import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/QueryState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RegistrationFormDialog } from '@/features/registrations/components/RegistrationFormDialog'
import { useRegistrationEligibility } from '@/features/registrations/hooks/useRegistrations'
import { formatDateRange, formatMoney } from '@/lib/format'
import { GENDER, missingFieldLabels, REGISTRATION_STATUS } from '@/lib/labels'
import type { AvailableSummary } from '@/types/facility'
import { useAvailableSummary } from '../hooks/useRooms'

/**
 * Chỗ trống cho sinh viên (US-02.2), gom theo tòa × loại phòng, kiêm nơi nộp đơn
 * (US-02.3): bấm "Đăng ký" ở một dòng là nộp đơn với nguyện vọng đó.
 *
 * Không liệt kê từng phòng: ban quản lý mới là người xếp giường cụ thể khi duyệt
 * (US-03). Backend chỉ trả phòng sinh viên được ở — tòa cùng giới tính.
 */
export function AvailableRoomsPage() {
  const query = useAvailableSummary()
  const eligibility = useRegistrationEligibility()
  const [target, setTarget] = useState<AvailableSummary | null>(null)

  // Giữ thứ tự backend trả về (đã sắp theo tòa rồi loại phòng).
  const byBuilding = new Map<string, AvailableSummary[]>()
  for (const row of query.data ?? []) {
    const rows = byBuilding.get(row.building.id)
    if (rows) rows.push(row)
    else byBuilding.set(row.building.id, [row])
  }

  return (
    <>
      <PageHeader
        title="Chỗ trống"
        description="Số giường còn trống ở các tòa dành cho bạn. Giá tính cho một sinh viên trong một tháng; ban quản lý xếp phòng cụ thể khi duyệt đơn."
      />

      {!eligibility.isLoading && <EligibilityNotice {...eligibility} />}

      {query.isPending && <LoadingState />}
      {query.isError && <ErrorState error={query.error} />}
      {query.data?.length === 0 && (
        <EmptyState
          title="Hiện không còn chỗ trống"
          description="Hãy quay lại sau — ban quản lý cập nhật khi có sinh viên trả phòng."
        />
      )}

      <div className="space-y-4">
        {[...byBuilding.values()].map((rows) => {
          const { building } = rows[0]
          return (
            <Card key={building.id}>
              <CardHeader>
                <CardTitle>Tòa {building.name}</CardTitle>
                <CardAction>
                  <StatusBadge {...GENDER[building.gender]} />
                </CardAction>
              </CardHeader>
              <CardContent className="divide-y">
                {rows.map((row) => (
                  <div
                    key={row.roomType.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{row.roomType.name}</p>
                      <p className="text-muted-foreground text-sm">
                        {formatMoney(row.roomType.price)} / tháng · {row.roomType.capacity} giường/phòng
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tone-success rounded-md border px-2 py-0.5 text-xs font-medium">
                        Còn {row.availableBeds} giường · {row.roomCount} phòng
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!eligibility.canSubmit}
                        onClick={() => setTarget(row)}
                      >
                        Đăng ký
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {eligibility.period && (
        <RegistrationFormDialog
          target={target}
          onClose={() => setTarget(null)}
          periodName={eligibility.period.name}
        />
      )}
    </>
  )
}

/** Vì sao nút "Đăng ký" đang tắt — hoặc đợt nào đang nhận đơn. */
function EligibilityNotice({
  period,
  profile,
  activeInPeriod,
}: ReturnType<typeof useRegistrationEligibility>) {
  return (
    <div className="mb-4 space-y-2">
      {period ? (
        <p className="tone-info rounded-md border p-3 text-sm">
          Đang mở đợt <strong>{period.name}</strong>: nhận đơn{' '}
          {formatDateRange(period.startAt, period.endAt)}, thời gian ở{' '}
          {formatDateRange(period.stayStartAt, period.stayEndAt)}.
        </p>
      ) : (
        <p className="bg-muted text-muted-foreground rounded-md border p-3 text-sm">
          Hiện chưa có đợt đăng ký nào đang mở, bạn chưa nộp đơn được.
        </p>
      )}

      {profile && !profile.isComplete && (
        <p className="tone-warning rounded-md border p-3 text-sm">
          Hồ sơ còn thiếu: <strong>{missingFieldLabels(profile.missingFields)}</strong>.{' '}
          <Link to="/student/profile" className="font-medium underline underline-offset-4">
            Hoàn thiện hồ sơ
          </Link>{' '}
          để nộp đơn.
        </p>
      )}

      {activeInPeriod && (
        <p className="text-muted-foreground text-sm">
          Bạn đã có đơn {REGISTRATION_STATUS[activeInPeriod.status].label.toLowerCase()} trong đợt này —{' '}
          <Link to="/student/registrations" className="underline underline-offset-4">
            xem đơn
          </Link>
          .
        </p>
      )}
    </div>
  )
}
