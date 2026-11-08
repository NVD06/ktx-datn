import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/QueryState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/format'
import { HYGIENE_MARK_LIMIT, HYGIENE_VIOLATIONS, HYGIENE_WARNING_SCORE, isLowPriority } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { HygieneRecord } from '@/types/hygiene'
import { HygienePeriodChart } from '../components/HygienePeriodChart'
import { useMyHygieneMarks, useMyHygieneRecords } from '../hooks/useHygiene'
import { periodLabel, periodOf, shiftPeriod } from '../hygiene-period'

/**
 * Điểm vệ sinh phòng của sinh viên (US-05.5) — chỉ trong thời gian mình ở phòng đó: điểm kỳ này,
 * điểm cuối kỳ của 6 kỳ gần nhất, số dấu trong hợp đồng, lịch sử trừ điểm và bảng lỗi. Mỗi kỳ là
 * nửa tháng (1–15, 16–cuối tháng), đầu kỳ phòng về 100 điểm; kỳ nào dưới ngưỡng là một dấu.
 */
export function MyHygienePage() {
  const records = useMyHygieneRecords()
  const marks = useMyHygieneMarks()
  const [now] = useState(() => new Date())
  const byPeriod = useMemo(() => {
    const map = new Map<string, HygieneRecord[]>()
    for (const r of records.data ?? []) {
      const key = periodOf(r.checkDate)
      map.set(key, [...(map.get(key) ?? []), r])
    }
    return map
  }, [records.data])
  const list = records.data ?? []
  const latest = list[0]
  const thisPeriod = periodOf(now.toISOString())
  const periodChecks = byPeriod.get(thisPeriod) ?? []
  const score = periodChecks[0]?.score ?? 100
  const warning = score < HYGIENE_WARNING_SCORE
  const periods = Array.from({ length: 6 }, (_, i) => {
    const period = shiftPeriod(thisPeriod, i - 5)
    return { tick: periodLabel(period), score: byPeriod.get(period)?.[0]?.score ?? null, current: period === thisPeriod }
  })
  const overLimit = isLowPriority(marks.data?.marks ?? 0)
  return (
    <>
      <PageHeader
        title="Vệ sinh"
        description={`Điểm vệ sinh phòng bạn theo kỳ nửa tháng: đầu kỳ 100 điểm, mỗi lỗi bị trừ dồn. Dưới ${HYGIENE_WARNING_SCORE} điểm là cảnh báo và bị một dấu.`}
      />
      {records.isPending && <LoadingState />}
      {records.isError && <ErrorState error={records.error} />}
      {records.isSuccess && (
        <div className="space-y-4">
          {latest && (
            <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <Card>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground text-sm">
                    Kỳ {periodLabel(thisPeriod)} (đến {formatDate(now).slice(0, 5)})
                  </p>
                  <p className="flex items-baseline gap-1">
                    <span
                      className={cn(
                        'text-5xl font-bold tabular-nums',
                        warning ? 'text-(--tone-danger-fg)' : 'text-(--tone-success-fg)',
                      )}
                    >
                      {score}
                    </span>
                    <span className="text-muted-foreground">/ 100</span>
                  </p>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className={cn('h-full rounded-full', warning ? 'bg-(--tone-danger-fg)' : 'bg-(--tone-success-fg)')}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Phòng {latest.room.code} · Tòa {latest.room.building.name} ·{' '}
                    {periodChecks.length > 0 ? `${periodChecks.length} đợt kiểm tra kỳ này` : 'chưa kiểm tra kỳ này'} ·
                    ngưỡng cảnh báo {HYGIENE_WARNING_SCORE}
                  </p>
                  {warning && (
                    <p className="tone-danger rounded-md border p-2 text-xs">
                      Phòng đang dưới mức cảnh báo — hãy cùng các bạn cùng phòng dọn dẹp trước lần kiểm tra sau.
                    </p>
                  )}
                  {marks.data && (
                    <div className="flex items-center justify-between gap-2 border-t pt-3 text-sm">
                      <span className="text-muted-foreground">Dấu vệ sinh trong hợp đồng</span>
                      <span className={cn('font-semibold tabular-nums', overLimit && 'text-(--tone-danger-fg)')}>
                        {marks.data.marks} / {HYGIENE_MARK_LIMIT}
                      </span>
                    </div>
                  )}
                  {overLimit && (
                    <p className="tone-danger rounded-md border p-2 text-xs">
                      Bạn đã quá {HYGIENE_MARK_LIMIT} dấu — đơn đăng ký phòng và yêu cầu gia hạn sẽ bị xếp không ưu tiên.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">6 kỳ gần nhất</CardTitle>
                  <span className="text-muted-foreground text-xs">
                    điểm cuối kỳ · vạch đứt = ngưỡng {HYGIENE_WARNING_SCORE}
                  </span>
                </CardHeader>
                <CardContent>
                  <HygienePeriodChart data={periods} />
                </CardContent>
              </Card>
            </div>
          )}
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lịch sử trừ điểm</CardTitle>
              </CardHeader>
              <CardContent>
                {list.length === 0 ? (
                  <EmptyState
                    title="Chưa có lần chấm điểm nào"
                    description="Điểm vệ sinh hiện ở đây sau khi ban quản lý kiểm tra phòng bạn đang ở."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ngày</TableHead>
                        <TableHead>Lỗi vi phạm</TableHead>
                        <TableHead className="text-right">Điểm trừ</TableHead>
                        <TableHead className="text-right">Còn lại</TableHead>
                        <TableHead>Người chấm</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {list.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <p className="tabular-nums">{formatDate(r.checkDate)}</p>
                            <p className="text-muted-foreground text-xs">Phòng {r.room.code}</p>
                          </TableCell>
                          <TableCell className="whitespace-normal">
                            {r.note ?? (
                              <span className="text-muted-foreground">{r.deduction > 0 ? '—' : 'Không có lỗi'}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {r.deduction > 0 ? (
                              <span className="tone-danger rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums">
                                −{r.deduction}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right font-semibold tabular-nums',
                              r.score < HYGIENE_WARNING_SCORE && 'text-(--tone-danger-fg)',
                            )}
                          >
                            {r.score}
                          </TableCell>
                          <TableCell>{r.checkedBy.fullName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tiêu chí trừ điểm</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-sm">
                  {Object.values(HYGIENE_VIOLATIONS).map((v) => (
                    <li key={v.label} className="flex justify-between gap-3">
                      <span>{v.label}</span>
                      <span className="font-semibold text-(--tone-danger-fg) tabular-nums">−{v.points}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground border-t pt-3 text-xs">
                  Mỗi kỳ nửa tháng (1–15, 16–cuối tháng) phòng có 100 điểm, lỗi của các đợt trừ dồn trong kỳ. Còn
                  dưới {HYGIENE_WARNING_SCORE} điểm là cảnh báo và mỗi SV trong phòng bị một dấu (kỳ vào ở giữa chừng
                  không tính); quá {HYGIENE_MARK_LIMIT} dấu trong hợp đồng thì không được ưu tiên khi đăng ký phòng, gia
                  hạn.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
