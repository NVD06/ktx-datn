import type { ColumnDef } from '@tanstack/react-table'
import { ClipboardCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions } from '@/components/shared/RowActions'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useListParams } from '@/hooks/useListParams'
import { formatDate, orDash } from '@/lib/format'
import { HYGIENE_FILTER_OPTIONS, HYGIENE_WARNING_SCORE, hygieneScore } from '@/lib/labels'
import type { HygieneRecord } from '@/types/hygiene'
import { useDeleteHygieneRecord, useHygieneRecords } from '../hooks/useHygiene'

/**
 * Bảng điểm vệ sinh (US-05.5): lọc theo tháng, chỉ lần chấm dưới ngưỡng — điểm dưới 60 hiện
 * badge đỏ. Chấm điểm làm ở trang riêng theo đợt (tòa + ngày). Backend tự giới hạn phạm vi:
 * MANAGER chỉ thấy tòa mình.
 */
export function HygieneListPage() {
  const list = useListParams(['month', 'belowWarning'] as const)
  const query = useHygieneRecords(list.params)
  const remove = useDeleteHygieneRecord()
  const [deleting, setDeleting] = useState<HygieneRecord | null>(null)

  const columns: ColumnDef<HygieneRecord>[] = [
    {
      id: 'checkDate',
      header: 'Ngày kiểm tra',
      enableSorting: true,
      cell: ({ row }) => formatDate(row.original.checkDate),
    },
    {
      id: 'room',
      header: 'Phòng',
      cell: ({ row }) => `${row.original.room.code} · Tòa ${row.original.room.building.name}`,
    },
    {
      id: 'score',
      header: 'Điểm còn lại',
      enableSorting: true,
      cell: ({ row }) => <StatusBadge {...hygieneScore(row.original.score)} />,
    },
    {
      id: 'deduction',
      header: 'Điểm trừ',
      meta: { className: 'text-right' },
      cell: ({ row }) => (row.original.deduction > 0 ? `−${row.original.deduction}` : '—'),
    },
    {
      id: 'note',
      header: 'Ghi chú',
      cell: ({ row }) => <p className="max-w-72 truncate">{orDash(row.original.note)}</p>,
    },
    {
      id: 'checkedBy',
      header: 'Người chấm',
      cell: ({ row }) => row.original.checkedBy.fullName,
    },
    {
      id: 'actions',
      header: '',
      meta: { className: 'w-12 text-right' },
      cell: ({ row }) => (
        <RowActions
          actions={[{ label: 'Xóa điểm', icon: Trash2, destructive: true, onSelect: () => setDeleting(row.original) }]}
        />
      ),
    },
  ]

  const filtered = !!(list.search || list.filters.month || list.filters.belowWarning)

  return (
    <>
      <PageHeader
        title="Vệ sinh"
        description={`Điểm vệ sinh từng phòng qua các đợt kiểm tra, trừ dồn trong kỳ nửa tháng (1–15, 16–cuối tháng) — dưới ${HYGIENE_WARNING_SCORE} điểm là cảnh báo.`}
        actions={
          <Button asChild>
            <Link to="/admin/hygiene/score">
              <ClipboardCheck />
              Chấm điểm
            </Link>
          </Button>
        }
      />

      <DataTable
        columns={columns}
        query={query}
        list={list}
        emptyTitle="Chưa có điểm vệ sinh nào"
        emptyDescription={filtered ? 'Thử bỏ bớt bộ lọc.' : 'Bấm "Chấm điểm" để nhập đợt kiểm tra đầu tiên.'}
        toolbar={
          <>
            <SearchInput value={list.search} onChange={list.setSearch} placeholder="Tìm theo phòng, tòa" />
            <Input
              type="month"
              value={list.filters.month}
              onChange={(e) => list.setFilter('month', e.target.value)}
              className="bg-card w-44"
              aria-label="Tháng kiểm tra"
            />
            <FilterSelect
              value={list.filters.belowWarning}
              onChange={(v) => list.setFilter('belowWarning', v)}
              options={HYGIENE_FILTER_OPTIONS}
              allLabel="Mức điểm"
            />
          </>
        }
      />

      <ConfirmDialog
        target={deleting}
        onClose={() => setDeleting(null)}
        title="Xóa điểm vệ sinh?"
        description={(r) => (
          <>
            Xóa điểm phòng <strong>{r.room.code}</strong> (tòa {r.room.building.name}) ngày{' '}
            <strong>{formatDate(r.checkDate)}</strong>. Chỉ dùng khi chấm nhầm phòng — sai lỗi thì chấm lại ở trang
            Chấm điểm để ghi đè. Điểm các đợt sau trong kỳ được tính lại.
          </>
        )}
        confirmLabel="Xóa điểm"
        isPending={remove.isPending}
        onConfirm={(r) => remove.mutateAsync(r.id).then(() => toast.success(`Đã xóa điểm phòng ${r.room.code}`))}
      />
    </>
  )
}
