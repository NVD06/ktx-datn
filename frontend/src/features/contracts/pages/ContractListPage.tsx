import type { ColumnDef } from '@tanstack/react-table'
import { Ban, CalendarPlus, Eye, LogOut } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DataTable } from '@/components/shared/DataTable'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { PageHeader } from '@/components/shared/PageHeader'
import { ReasonDialog } from '@/components/shared/ReasonDialog'
import { RowActions, type RowAction } from '@/components/shared/RowActions'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { usePeriodOptions } from '@/features/registration-periods/hooks/useRegistrationPeriods'
import { useDialogState } from '@/hooks/useDialogState'
import { useListParams } from '@/hooks/useListParams'
import { bedPlace, formatDateRange, formatMoney } from '@/lib/format'
import { CONTRACT_STATUS, toOptions } from '@/lib/labels'
import type { Contract } from '@/types/contract'
import { ContractDetailSheet } from '../components/ContractDetailSheet'
import { ExtendContractDialog } from '../components/ExtendContractDialog'
import { canCancel, isRunning } from '../contract-actions'
import { useContracts, useEndContract } from '../hooks/useContracts'

const STATUS_OPTIONS = toOptions(CONTRACT_STATUS)

/** Còn hóa đơn chưa thanh toán thì cảnh báo — vẫn cho chấm dứt, hóa đơn giữ lại để thu sau. */
function unpaidNote(contract: Contract) {
  const unpaid = contract.invoices.filter((i) => i.status === 'UNPAID')
  if (unpaid.length === 0) return ''
  const total = unpaid.reduce((sum, i) => sum + Number(i.amount), 0)
  return ` Lưu ý: còn ${unpaid.length} hóa đơn chưa thanh toán (${formatMoney(total)}), hóa đơn giữ nguyên để thu sau.`
}

/**
 * Hợp đồng cho người quản lý (US-03.4). Backend tự giới hạn phạm vi: MANAGER chỉ
 * thấy hợp đồng có giường thuộc tòa mình. Hợp đồng chờ ký thì hủy được; hợp đồng
 * đang ở (kể cả đã quá hạn mà chưa trả phòng) thì gia hạn hoặc chấm dứt.
 */
export function ContractListPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const list = useListParams(['status', 'periodId'] as const)
  const query = useContracts(list.params)
  const periodOptions = usePeriodOptions()
  const cancel = useEndContract('cancel')
  const terminate = useEndContract('terminate')

  const detail = useDialogState<Contract>()
  const [cancelling, setCancelling] = useState<Contract | null>(null)
  const [extending, setExtending] = useState<Contract | null>(null)
  const [terminating, setTerminating] = useState<Contract | null>(null)

  /** Thao tác theo trạng thái — dùng chung cho menu "…" của dòng và chân drawer chi tiết. */
  function actionsFor(contract: Contract): RowAction[] {
    // Mở dialog từ drawer thì đóng drawer, để dialog không chồng lên nó.
    const open = (set: (c: Contract) => void) => () => {
      detail.setOpen(false)
      set(contract)
    }
    if (canCancel(contract)) {
      return [{ label: 'Hủy hợp đồng chờ ký', icon: Ban, destructive: true, onSelect: open(setCancelling) }]
    }
    if (isRunning(contract)) {
      return [
        { label: 'Gia hạn', icon: CalendarPlus, onSelect: open(setExtending) },
        { label: 'Chấm dứt', icon: LogOut, destructive: true, onSelect: open(setTerminating) },
      ]
    }
    return []
  }

  const columns: ColumnDef<Contract>[] = [
    {
      id: 'code',
      header: 'Hợp đồng',
      enableSorting: true,
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.code}</p>
          <p className="text-muted-foreground text-xs">{row.original.period.term}</p>
        </div>
      ),
    },
    {
      id: 'student',
      header: 'Sinh viên',
      cell: ({ row }) => {
        const { student } = row.original
        return (
          <div>
            <p className="font-medium">{student.fullName}</p>
            <p className="text-muted-foreground text-xs">{student.profile?.studentCode ?? student.email}</p>
          </div>
        )
      },
    },
    {
      id: 'bed',
      header: 'Chỗ ở',
      cell: ({ row }) => {
        const { bed } = row.original
        return (
          <div>
            <p>
              {bed.code} · Phòng {bed.room.code}
            </p>
            <p className="text-muted-foreground text-xs">Tòa {bed.room.building.name}</p>
          </div>
        )
      },
    },
    {
      id: 'endDate',
      header: 'Thời gian ở',
      enableSorting: true,
      cell: ({ row }) => formatDateRange(row.original.startDate, row.original.endDate),
    },
    {
      id: 'price',
      header: 'Tiền phòng',
      meta: { className: 'text-right' },
      cell: ({ row }) => formatMoney(row.original.price),
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => <StatusBadge {...CONTRACT_STATUS[row.original.status]} />,
    },
    {
      id: 'actions',
      header: '',
      meta: { className: 'w-12 text-right' },
      cell: ({ row }) => {
        const contract = row.original
        return (
          <RowActions
            actions={[
              { label: 'Xem chi tiết', icon: Eye, onSelect: () => detail.show(contract) },
              ...actionsFor(contract),
            ]}
          />
        )
      },
    },
  ]

  const filtered = !!(list.search || list.filters.status || list.filters.periodId)

  return (
    <>
      <PageHeader
        title="Hợp đồng"
        description={
          isAdmin
            ? 'Hợp đồng ở KTX của mọi tòa nhà.'
            : 'Hợp đồng có giường thuộc tòa bạn quản lý.'
        }
      />

      <DataTable
        columns={columns}
        query={query}
        list={list}
        emptyTitle="Chưa có hợp đồng nào"
        emptyDescription={filtered ? 'Thử bỏ bớt bộ lọc.' : 'Hợp đồng được lập khi duyệt đơn đăng ký.'}
        toolbar={
          <>
            <SearchInput
              value={list.search}
              onChange={list.setSearch}
              placeholder="Tìm theo mã hợp đồng, tên, mã SV"
            />
            <FilterSelect
              value={list.filters.status}
              onChange={(v) => list.setFilter('status', v)}
              options={STATUS_OPTIONS}
              allLabel="Trạng thái"
            />
            <FilterSelect
              value={list.filters.periodId}
              onChange={(v) => list.setFilter('periodId', v)}
              options={periodOptions}
              allLabel="Mọi đợt"
            />
          </>
        }
      />

      <ContractDetailSheet
        contract={detail.item}
        open={detail.open}
        onOpenChange={detail.setOpen}
        actions={detail.item ? actionsFor(detail.item) : []}
      />
      <ReasonDialog
        target={cancelling}
        onClose={() => setCancelling(null)}
        title="Hủy hợp đồng chờ ký?"
        description={(c) =>
          `Hủy hợp đồng ${c.code} của ${c.student.fullName} (${bedPlace(c.bed)}). Giường trống lại ngay, ` +
          'đơn đăng ký chuyển sang "Đã hủy". Sinh viên đọc được lý do trong "Đơn của tôi".'
        }
        label="Lý do hủy"
        placeholder="Ví dụ: sinh viên không đến ký sau 7 ngày, đã liên hệ không được…"
        submitLabel="Hủy hợp đồng"
        isPending={cancel.isPending}
        closeOnErrorCode="CONTRACT_NOT_DRAFT"
        onSubmit={(c, reason) =>
          cancel
            .mutateAsync({ id: c.id, reason })
            .then(() => toast.success(`Đã hủy hợp đồng ${c.code}, ${bedPlace(c.bed)} đã trống`))
        }
      />
      <ReasonDialog
        target={terminating}
        onClose={() => setTerminating(null)}
        title="Chấm dứt hợp đồng?"
        description={(c) =>
          `Chấm dứt hợp đồng ${c.code} của ${c.student.fullName} (${bedPlace(c.bed)}). Giường trống lại ngay, ` +
          'không hoàn tiền tự động.' +
          unpaidNote(c)
        }
        label="Lý do chấm dứt"
        placeholder="Ví dụ: sinh viên trả phòng khi hết kỳ, vi phạm nội quy…"
        submitLabel="Chấm dứt"
        isPending={terminate.isPending}
        closeOnErrorCode="CONTRACT_NOT_ACTIVE"
        onSubmit={(c, reason) =>
          terminate
            .mutateAsync({ id: c.id, reason })
            .then(() => toast.success(`Đã chấm dứt hợp đồng ${c.code}, ${bedPlace(c.bed)} đã trống`))
        }
      />
      <ExtendContractDialog contract={extending} onClose={() => setExtending(null)} />
    </>
  )
}
