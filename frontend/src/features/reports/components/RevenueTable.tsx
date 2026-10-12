import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatMoney, formatMonth } from '@/lib/format'
import { INVOICE_TYPE } from '@/lib/labels'
import type { RevenueReport } from '@/types/report'
type Amounts = RevenueReport['total']
function MoneyCells({ amounts }: { amounts: Amounts }) {
  const values = [Number(amounts.roomFee), Number(amounts.utility)]
  return [...values, values[0]! + values[1]!].map((value, i) => (
    <TableCell key={i} className="text-right tabular-nums">
      <span className={value === 0 ? 'text-muted-foreground' : undefined}>{formatMoney(value)}</span>
    </TableCell>
  ))
}
export function RevenueTable({ report }: { report: RevenueReport }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tháng</TableHead>
          <TableHead className="text-right">{INVOICE_TYPE.ROOM_FEE.label}</TableHead>
          <TableHead className="text-right">{INVOICE_TYPE.UTILITY.label}</TableHead>
          <TableHead className="text-right">Tổng</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {report.months.map((m) => (
          <TableRow key={m.month}>
            <TableCell>{formatMonth(m.month)}</TableCell>
            <MoneyCells amounts={m} />
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Tổng thu</TableCell>
          <MoneyCells amounts={report.total} />
        </TableRow>
      </TableFooter>
    </Table>
  )
}