import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { BuildingDebt } from '@/types/report'
import { MoneyTotalText } from './MoneyTotalText'
export function BuildingDebtTable({ rows }: { rows: BuildingDebt[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tòa</TableHead>
          <TableHead className="text-right">Chưa thanh toán</TableHead>
          <TableHead className="text-right">Trong đó quá hạn</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ building, unpaid, overdue }) => (
          <TableRow key={building.id}>
            <TableCell className="font-medium">Tòa {building.name}</TableCell>
            <TableCell className="text-right">
              <MoneyTotalText total={unpaid} />
            </TableCell>
            <TableCell className="text-right">
              <MoneyTotalText total={overdue} danger />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}