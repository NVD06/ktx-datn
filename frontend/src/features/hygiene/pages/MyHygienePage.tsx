import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/QueryState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/format'
import { HYGIENE_WARNING_SCORE, hygieneScore } from '@/lib/labels'
import { useMyHygieneRecords } from '../hooks/useHygiene'

/**
 * Lịch sử điểm vệ sinh phòng của sinh viên (US-05.5) — chỉ trong thời gian mình ở phòng đó,
 * mới nhất trước. Lần gần nhất dưới ngưỡng thì nhắc ở đầu trang.
 */
export function MyHygienePage() {
  const records = useMyHygieneRecords()
  const latest = records.data?.[0]

  return (
    <>
      <PageHeader
        title="Vệ sinh"
        description={`Điểm vệ sinh phòng bạn qua các đợt kiểm tra. Dưới ${HYGIENE_WARNING_SCORE} điểm là cảnh báo.`}
      />

      {latest && latest.score < HYGIENE_WARNING_SCORE && (
        <p className="tone-danger mb-4 rounded-md border p-3 text-sm">
          Lần kiểm tra gần nhất ({formatDate(latest.checkDate)}) phòng {latest.room.code} chỉ đạt {latest.score} điểm,
          dưới mức {HYGIENE_WARNING_SCORE}.{latest.note && ` Lý do: ${latest.note}.`} Hãy cùng các bạn cùng phòng dọn
          dẹp trước lần kiểm tra sau.
        </p>
      )}

      {records.isPending && <LoadingState />}
      {records.isError && <ErrorState error={records.error} />}
      {records.data?.length === 0 && (
        <EmptyState
          title="Chưa có lần chấm điểm nào"
          description="Điểm vệ sinh hiện ở đây sau khi ban quản lý kiểm tra phòng bạn đang ở."
        />
      )}
      {records.data && records.data.length > 0 && (
        <Card>
          <CardContent>
            <ul className="divide-y text-sm">
              {records.data.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium">
                      {formatDate(r.checkDate)} · Phòng {r.room.code}, tòa {r.room.building.name}
                    </p>
                    {r.note && <p className="text-muted-foreground text-xs">{r.note}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {r.deduction > 0 && <span className="text-muted-foreground">Trừ {r.deduction} điểm</span>}
                    <StatusBadge {...hygieneScore(r.score)} />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  )
}
