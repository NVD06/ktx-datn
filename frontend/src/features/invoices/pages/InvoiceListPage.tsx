import type { ColumnDef } from '@tanstack/react-table'
import { Eye } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions } from '@/components/shared/RowActions'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useDialogState } from '@/hooks/useDialogState'
import { useListParams } from '@/hooks/useListParams'
import { formatDate, formatMoney } from '@/lib/format'
import { INVOICE_FILTER_OPTIONS, INVOICE_TYPE, invoiceStatus, toOptions } from '@/lib/labels'
import type { Invoice } from '@/types/invoice'
import { BuildingDebtCard } from '../components/BuildingDebtCard'
import { InvoiceDetailSheet } from '../components/InvoiceDetailSheet'
import { useInvoices, useInvoiceSummary } from '../hooks/useInvoices'

const TYPE_OPTIONS = toOptions(INVOICE_TYPE)

/** Ô tổng tiền kiêm nút lọc nhanh (US-04.6) — bấm vào thì đặt bộ lọc `status` bằng giá trị này. */
const SUMMARY_CARDS = [
  { key: 'all', label: 'Tổng', status: '' },
  { key: 'unpaid', label: 'Chưa thanh toán', status: 'UNPAID' },
  { key: 'overdue', label: 'Quá hạn', status: 'OVERDUE' },
] as const

/**
 * Hóa đơn cho người quản lý (US-04.3): lọc theo trạng thái / loại, tìm theo mã / kỳ / SV,
 * tổng tiền theo bộ lọc; ô tổng bấm được để lọc nhanh, Admin xem thêm công nợ từng tòa (US-04.6).
 * Backend tự giới hạn phạm vi: MANAGER chỉ thấy tòa mình.
 */
export function InvoiceListPage() {
  const { user } = useAuth()
  const list = useListParams(['status', 'type'] as const)
  const query = useInvoices(list.params)
  const summary = useInvoiceSummary(list.params)

  const detail = useDialogState<string>()

  const columns: ColumnDef<Invoice>[] = [
    {
      id: 'code',
      header: 'Hóa đơn',
      enableSorting: true,
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.code}</p>
          <p className="text-muted-foreground text-xs">
            {INVOICE_TYPE[row.original.type].label} · {row.original.period}
          </p>
        </div>
      ),
    },
    {
      id: 'student',
      header: 'Sinh viên',
      cell: ({ row }) => {
        const { student } = row.original.contract
        return (
          <div>
            <p className="font-medium">{student.fullName}</p>
            <p className="text-muted-foreground text-xs">{student.profile?.studentCode ?? student.email}</p>
          </div>
        )
      },
    },
    {
      id: 'room',
      header: 'Phòng',
      cell: ({ row }) => {
        const { room } = row.original.contract.bed
        return `${room.code} · Tòa ${room.building.name}`
      },
    },
    {
      id: 'amount',
      header: 'Số tiền',
      enableSorting: true,
      meta: { className: 'text-right' },
      cell: ({ row }) => formatMoney(row.original.amount),
    },
    {
      id: 'dueDate',
      header: 'Hạn',
      enableSorting: true,
      cell: ({ row }) => formatDate(row.original.dueDate),
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => <StatusBadge {...invoiceStatus(row.original)} />,
    },
    {
      id: 'actions',
      header: '',
      meta: { className: 'w-12 text-right' },
      cell: ({ row }) => (
        <RowActions actions={[{ label: 'Xem chi tiết', icon: Eye, onSelect: () => detail.show(row.original.id) }]} />
      ),
    },
  ]

  const filtered = !!(list.search || Object.values(list.filters).some(Boolean))

  return (
    <>
      <PageHeader title="Hóa đơn" description="Tiền phòng và tiền điện nước của sinh viên." />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {SUMMARY_CARDS.map(({ key, label, status }) => {
          const total = summary.data?.[key]
          return (
            <StatCard
              key={key}
              label={total ? `${label} (${total.count})` : label}
              active={list.filters.status === status}
              onClick={() => list.setFilter('status', status)}
            >
              <span className={key === 'overdue' && total?.count ? 'text-destructive' : undefined}>
                {total ? formatMoney(total.amount) : '—'}
              </span>
            </StatCard>
          )
        })}
      </div>

      {user?.role === 'ADMIN' && <BuildingDebtCard />}

      <DataTable
        columns={columns}
        query={query}
        list={list}
        emptyTitle="Không có hóa đơn nào"
        emptyDescription={filtered ? 'Thử bỏ bớt bộ lọc.' : 'Tiền phòng tự lập khi sinh viên ký hợp đồng và vào ngày 1 hằng tháng, điện nước lập ở trang Chốt điện nước.'}
        toolbar={
          <>
            <SearchInput
              value={list.search}
              onChange={list.setSearch}
              placeholder="Tìm mã hóa đơn, kỳ (2026-09), tên, mã SV"
            />
            <FilterSelect
              value={list.filters.status}
              onChange={(v) => list.setFilter('status', v)}
              options={INVOICE_FILTER_OPTIONS}
              allLabel="Trạng thái"
            />
            <FilterSelect
              value={list.filters.type}
              onChange={(v) => list.setFilter('type', v)}
              options={TYPE_OPTIONS}
              allLabel="Loại"
            />
          </>
        }
      />

      <InvoiceDetailSheet invoiceId={detail.item} open={detail.open} onOpenChange={detail.setOpen} />
    </>
  )
}
