import type { ColumnDef } from '@tanstack/react-table'
import { Eye } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions } from '@/components/shared/RowActions'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useDialogState } from '@/hooks/useDialogState'
import { useListParams } from '@/hooks/useListParams'
import { formatDate, formatMoney } from '@/lib/format'
import { INVOICE_FILTER_OPTIONS, INVOICE_TYPE, invoiceStatus, toOptions } from '@/lib/labels'
import type { Invoice } from '@/types/invoice'
import { InvoiceDetailSheet } from '../components/InvoiceDetailSheet'
import { useInvoices, useInvoiceSummary } from '../hooks/useInvoices'

const TYPE_OPTIONS = toOptions(INVOICE_TYPE)
const SUMMARY_LABELS = { all: 'Tổng', unpaid: 'Chưa thanh toán', overdue: 'Quá hạn' } as const

/**
 * Hóa đơn cho người quản lý (US-04.3): lọc theo trạng thái / loại, tìm theo mã / kỳ / SV,
 * tổng tiền theo đúng bộ lọc. Backend tự giới hạn phạm vi: MANAGER chỉ thấy tòa mình.
 */
export function InvoiceListPage() {
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
        {Object.entries(SUMMARY_LABELS).map(([key, label]) => {
          const total = summary.data?.[key as keyof typeof SUMMARY_LABELS]
          return (
            <StatCard key={key} label={total ? `${label} (${total.count})` : label}>
              <span className={key === 'overdue' && total?.count ? 'text-destructive' : undefined}>
                {total ? formatMoney(total.amount) : '—'}
              </span>
            </StatCard>
          )
        })}
      </div>

      <DataTable
        columns={columns}
        query={query}
        list={list}
        emptyTitle="Không có hóa đơn nào"
        emptyDescription={filtered ? 'Thử bỏ bớt bộ lọc.' : 'Tiền phòng lập khi sinh viên ký hợp đồng, điện nước lập ở trang Chốt điện nước.'}
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
