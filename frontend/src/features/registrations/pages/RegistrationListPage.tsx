import type { ColumnDef } from '@tanstack/react-table'
import { BedDouble, Eye, XCircle } from 'lucide-react'
import { useState } from 'react'
import { DataTable } from '@/components/shared/DataTable'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions, type RowAction } from '@/components/shared/RowActions'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useRegistrationPeriods } from '@/features/registration-periods/hooks/useRegistrationPeriods'
import { useListParams } from '@/hooks/useListParams'
import { formatDateTime, orDash } from '@/lib/format'
import { GENDER, REGISTRATION_STATUS } from '@/lib/labels'
import type { RegistrationListItem } from '@/types/registration'
import { ApproveRegistrationDialog } from '../components/ApproveRegistrationDialog'
import { RegistrationDetailSheet } from '../components/RegistrationDetailSheet'
import { RejectRegistrationDialog } from '../components/RejectRegistrationDialog'
import { useRegistrations } from '../hooks/useRegistrations'

const STATUS_OPTIONS = Object.entries(REGISTRATION_STATUS).map(([value, { label }]) => ({ value, label }))

/** Đủ cho bộ lọc: mỗi học kỳ một đợt, 100 đợt là vài chục năm. */
const PERIOD_OPTION_PARAMS = { limit: 100 }

/**
 * Đơn đăng ký ở KTX cho người duyệt: xem (US-02.4), duyệt + xếp giường, từ chối
 * (US-03.1/2). Backend tự giới hạn phạm vi: MANAGER chỉ thấy đơn chọn tòa mình và
 * đơn "tòa nào cũng được" hợp giới tính tòa.
 */
export function RegistrationListPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const list = useListParams(['status', 'periodId'] as const)
  const query = useRegistrations(list.params)
  const periods = useRegistrationPeriods(PERIOD_OPTION_PARAMS)
  const periodOptions = (periods.data?.data ?? []).map((p) => ({ value: p.id, label: p.name }))

  const [selected, setSelected] = useState<RegistrationListItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [approving, setApproving] = useState<RegistrationListItem | null>(null)
  const [rejecting, setRejecting] = useState<RegistrationListItem | null>(null)

  function openDetail(registration: RegistrationListItem) {
    setSelected(registration)
    setDetailOpen(true)
  }

  // Bấm duyệt/từ chối từ drawer: đóng drawer để dialog không chồng lên nó.
  function openApprove(registration: RegistrationListItem) {
    setDetailOpen(false)
    setApproving(registration)
  }

  function openReject(registration: RegistrationListItem) {
    setDetailOpen(false)
    setRejecting(registration)
  }

  const columns: ColumnDef<RegistrationListItem>[] = [
    {
      id: 'student',
      header: 'Sinh viên',
      cell: ({ row }) => {
        const { student } = row.original
        return (
          <div>
            <p className="font-medium">{student.fullName}</p>
            <p className="text-muted-foreground text-xs">
              {student.profile ? `${student.profile.studentCode} · ` : ''}
              {student.email}
            </p>
          </div>
        )
      },
    },
    {
      id: 'gender',
      header: 'Giới tính',
      cell: ({ row }) => {
        const profile = row.original.student.profile
        return orDash(profile && GENDER[profile.gender].label)
      },
    },
    {
      id: 'period',
      header: 'Đợt',
      cell: ({ row }) => row.original.period.name,
    },
    {
      id: 'preference',
      header: 'Nguyện vọng',
      cell: ({ row }) => {
        const { building, preferredRoomType } = row.original
        return (
          <div>
            <p>{building ? `Tòa ${building.name}` : 'Tòa nào cũng được'}</p>
            <p className="text-muted-foreground text-xs">
              {preferredRoomType?.name ?? 'Loại nào cũng được'}
            </p>
          </div>
        )
      },
    },
    {
      id: 'createdAt',
      header: 'Nộp lúc',
      enableSorting: true,
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    {
      id: 'status',
      header: 'Trạng thái',
      enableSorting: true,
      cell: ({ row }) => <StatusBadge {...REGISTRATION_STATUS[row.original.status]} />,
    },
    {
      id: 'actions',
      header: '',
      meta: { className: 'w-12 text-right' },
      cell: ({ row }) => {
        const registration = row.original
        const actions: RowAction[] = [
          { label: 'Xem chi tiết', icon: Eye, onSelect: () => openDetail(registration) },
        ]
        if (registration.status === 'PENDING') {
          actions.push(
            { label: 'Duyệt và xếp giường', icon: BedDouble, onSelect: () => openApprove(registration) },
            { label: 'Từ chối', icon: XCircle, destructive: true, onSelect: () => openReject(registration) },
          )
        }
        return <RowActions actions={actions} />
      },
    },
  ]

  const filtered = !!(list.search || list.filters.status || list.filters.periodId)

  return (
    <>
      <PageHeader
        title="Đơn đăng ký"
        description={
          isAdmin
            ? 'Đơn đăng ký ở KTX của mọi tòa nhà.'
            : 'Đơn chọn tòa bạn quản lý và đơn "tòa nào cũng được" của sinh viên phù hợp giới tính tòa.'
        }
      />

      <DataTable
        columns={columns}
        query={query}
        list={list}
        emptyTitle="Chưa có đơn đăng ký nào"
        emptyDescription={filtered ? 'Thử bỏ bớt bộ lọc.' : undefined}
        toolbar={
          <>
            <SearchInput
              value={list.search}
              onChange={list.setSearch}
              placeholder="Tìm theo tên, email, mã SV"
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

      <RegistrationDetailSheet
        registration={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onApprove={openApprove}
        onReject={openReject}
      />
      <ApproveRegistrationDialog registration={approving} onClose={() => setApproving(null)} />
      <RejectRegistrationDialog registration={rejecting} onClose={() => setRejecting(null)} />
    </>
  )
}
