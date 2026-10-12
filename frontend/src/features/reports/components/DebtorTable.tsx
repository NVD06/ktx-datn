import type { ColumnDef } from '@tanstack/react-table'
import { Receipt } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DataTable } from '@/components/shared/DataTable'
import { RowActions } from '@/components/shared/RowActions'
import { SearchInput } from '@/components/shared/SearchInput'
import { useListParams } from '@/hooks/useListParams'
import type { Debtor } from '@/types/report'
import { useDebtors } from '../hooks/useReports'
import { MoneyTotalText } from './MoneyTotalText'
export function DebtorTable() {
  const navigate = useNavigate()
  const list = useListParams()
  const query = useDebtors(list.params)
  const columns: ColumnDef<Debtor>[] = [
    {
      id: 'student',
      header: 'Sinh viên',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.fullName}</p>
          <p className="text-muted-foreground text-xs">{row.original.profile?.studentCode ?? row.original.email}</p>
        </div>
      ),
    },
    {
      id: 'room',
      header: 'Phòng',
      cell: ({ row }) => `${row.original.room.code} · Tòa ${row.original.room.building.name}`,
    },
    {
      id: 'unpaid',
      header: 'Chưa thanh toán',
      meta: { className: 'text-right' },
      cell: ({ row }) => <MoneyTotalText total={row.original.unpaid} />,
    },
    {
      id: 'overdue',
      header: 'Quá hạn',
      meta: { className: 'text-right' },
      cell: ({ row }) => <MoneyTotalText total={row.original.overdue} danger />,
    },
    {
      id: 'actions',
      header: '',
      meta: { className: 'w-12 text-right' },
      cell: ({ row }) => {
        const to = `/admin/invoices?${new URLSearchParams({ status: 'UNPAID', search: row.original.email })}`
        return <RowActions actions={[{ label: 'Xem hóa đơn', icon: Receipt, onSelect: () => navigate(to) }]} />
      },
    },
  ]
  return (
    <DataTable
      columns={columns}
      query={query}
      list={list}
      emptyTitle={list.search ? 'Không tìm thấy sinh viên nào' : 'Không ai còn nợ'}
      emptyDescription={list.search ? 'Thử từ khóa khác.' : 'Mọi hóa đơn đã được thanh toán.'}
      toolbar={<SearchInput value={list.search} onChange={list.setSearch} placeholder="Tìm tên, email, mã SV" />}
    />
  )
}