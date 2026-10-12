import { StatusBadge } from '@/components/shared/StatusBadge'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatMonth, orDash } from '@/lib/format'
import { hygieneScore, REQUEST_STATUS } from '@/lib/labels'
import type { RequestStatus } from '@/types/maintenance'
import type { MaintenanceReport } from '@/types/report'
const STATUSES = Object.keys(REQUEST_STATUS) as RequestStatus[]
function CountCells({ counts }: { counts: Record<RequestStatus, number> }) {
  const values = [...STATUSES.map((s) => counts[s]), STATUSES.reduce((n, s) => n + counts[s], 0)]
  return values.map((value, i) => (
    <TableCell key={i} className="text-right tabular-nums">
      <span className={value === 0 ? 'text-muted-foreground' : undefined}>{value}</span>
    </TableCell>
  ))
}
export function RequestMonthTable({ requests }: { requests: MaintenanceReport['requests'] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tháng gửi</TableHead>
          {STATUSES.map((s) => (
            <TableHead key={s} className="text-right whitespace-normal">
              {REQUEST_STATUS[s].label}
            </TableHead>
          ))}
          <TableHead className="text-right">Tổng</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.months.map((m) => (
          <TableRow key={m.month}>
            <TableCell>{formatMonth(m.month)}</TableCell>
            <CountCells counts={m.byStatus} />
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Tổng cộng</TableCell>
          <CountCells counts={requests.total} />
        </TableRow>
      </TableFooter>
    </Table>
  )
}
export function LowScoreTable({ rows }: { rows: MaintenanceReport['lowScores'] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Phòng</TableHead>
          <TableHead>Ngày chấm</TableHead>
          <TableHead>Điểm</TableHead>
          <TableHead>Ghi chú</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-medium">
              {r.room.code} · Tòa {r.room.building.name}
            </TableCell>
            <TableCell>{formatDate(r.checkDate)}</TableCell>
            <TableCell>
              <StatusBadge {...hygieneScore(r.score)} />
            </TableCell>
            <TableCell className="whitespace-normal">{orDash(r.note)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
