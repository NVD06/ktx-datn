import { ErrorState, LoadingState } from '@/components/shared/QueryState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatMoney } from '@/lib/format'
import type { MoneyTotal } from '@/types/invoice'
import { useDebtByBuilding } from '../hooks/useInvoices'

/**
 * Công nợ từng tòa (US-04.6). Chỉ trang của Admin dùng — Manager quản lý một tòa nên
 * các ô tổng đầu trang đã là công nợ tòa mình.
 */
export function BuildingDebtCard() {
  const debt = useDebtByBuilding()

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base">Công nợ theo tòa</CardTitle>
        <CardDescription>Hóa đơn chưa thanh toán của từng tòa, không phụ thuộc bộ lọc bên dưới.</CardDescription>
      </CardHeader>
      <CardContent>
        {debt.isPending && <LoadingState />}
        {debt.isError && <ErrorState error={debt.error} />}
        {debt.data?.length === 0 && <p className="text-muted-foreground text-sm">Chưa có tòa nhà nào.</p>}
        {!!debt.data?.length && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tòa</TableHead>
                <TableHead className="text-right">Chưa thanh toán</TableHead>
                <TableHead className="text-right">Trong đó quá hạn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debt.data.map(({ building, unpaid, overdue }) => (
                <TableRow key={building.id}>
                  <TableCell className="font-medium">Tòa {building.name}</TableCell>
                  <TableCell className="text-right">
                    <Total total={unpaid} />
                  </TableCell>
                  <TableCell className={overdue.count ? 'text-destructive text-right' : 'text-right'}>
                    <Total total={overdue} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function Total({ total }: { total: MoneyTotal }) {
  return (
    <>
      {formatMoney(total.amount)}
      <span className="text-muted-foreground ml-1 text-xs">({total.count})</span>
    </>
  )
}
