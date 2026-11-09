import type { ColumnDef } from '@tanstack/react-table'
import { BellRing, Eye } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions } from '@/components/shared/RowActions'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { useDialogState } from '@/hooks/useDialogState'
import { useListParams } from '@/hooks/useListParams'
import { formatDate, formatDayMonthVN, formatMoney } from '@/lib/format'
import { INVOICE_FILTER_OPTIONS, INVOICE_TYPE, invoiceStatus, remindAction, toOptions } from '@/lib/labels'
import type { Invoice } from '@/types/invoice'
import { InvoiceDetailSheet } from '../components/InvoiceDetailSheet'
import { useInvoices, useRemindInvoices } from '../hooks/useInvoices'

const TYPE_OPTIONS = toOptions(INVOICE_TYPE)

/**
 * Hóa đơn cho người quản lý (US-04.3): lọc theo trạng thái / loại, tìm theo mã / kỳ / SV.
 * Tổng công nợ xem ở trang Tổng quan (US-06.1). Backend tự giới hạn phạm vi: MANAGER chỉ thấy tòa mình.
 */
export function InvoiceListPage() {
  const list = useListParams(['status', 'type'] as const)
  const query = useInvoices(list.params)

  const detail = useDialogState<string>()
  const remind = useRemindInvoices()
  const [remindingAll, setRemindingAll] = useState(false)

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
      cell: ({ row }) => (
        <div>
          <StatusBadge {...invoiceStatus(row.original)} />
          {row.original.status === 'UNPAID' && row.original.remindedAt && (
            <p className="text-muted-foreground mt-1 text-xs">Đã nhắc {formatDayMonthVN(row.original.remindedAt)}</p>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      meta: { className: 'w-12 text-right' },
      cell: ({ row }) => (
        <RowActions
          actions={[
            { label: 'Xem chi tiết', icon: Eye, onSelect: () => detail.show(row.original.id) },
            ...(row.original.status === 'UNPAID'
              ? [
                  {
                    ...remindAction(row.original, remind.isPending),
                    icon: BellRing,
                    onSelect: () => remind.mutate([row.original.id], { onError: (error) => toast.error(getErrorMessage(error)) }),
                  },
                ]
              : []),
          ]}
        />
      ),
    },
  ]

  const filtered = !!(list.search || Object.values(list.filters).some(Boolean))

  return (
    <>
      <PageHeader
        title="Hóa đơn"
        description="Tiền phòng và tiền điện nước của sinh viên. Nhắc nộp tiền gửi thông báo riêng cho sinh viên."
        actions={
          <Button variant="outline" onClick={() => setRemindingAll(true)}>
            <BellRing />
            Nhắc nộp tiền
          </Button>
        }
      />

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
      <ConfirmDialog
        target={remindingAll ? 'all' : null}
        onClose={() => setRemindingAll(false)}
        title="Nhắc nộp tiền mọi hóa đơn chưa thanh toán?"
        description={() =>
          'Mỗi sinh viên còn hóa đơn chưa thanh toán nhận một thông báo riêng liệt kê các hóa đơn và hạn nộp. ' +
          'Hóa đơn đã nhắc trong hôm nay thì bỏ qua.'
        }
        confirmLabel="Gửi nhắc"
        destructive={false}
        isPending={remind.isPending}
        onConfirm={() => remind.mutateAsync(undefined)}
      />
    </>
  )
}
