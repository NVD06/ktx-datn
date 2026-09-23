import type { ColumnDef } from '@tanstack/react-table'
import { Eye } from 'lucide-react'
import { useState } from 'react'
import { DataTable } from '@/components/shared/DataTable'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useRegistrationPeriods } from '@/features/registration-periods/hooks/useRegistrationPeriods'
import { useListParams } from '@/hooks/useListParams'
import { formatDateTime, orDash } from '@/lib/format'
import { GENDER, REGISTRATION_STATUS } from '@/lib/labels'
import type { RegistrationListItem } from '@/types/registration'
import { RegistrationDetailSheet } from '../components/RegistrationDetailSheet'
import { useRegistrations } from '../hooks/useRegistrations'

const STATUS_OPTIONS = Object.entries(REGISTRATION_STATUS).map(([value, { label }]) => ({ value, label }))

/** Đủ cho bộ lọc: mỗi học kỳ một đợt, 100 đợt là vài chục năm. */
const PERIOD_OPTION_PARAMS = { limit: 100 }

/**
 * Đơn đăng ký ở KTX cho người duyệt (US-02.4). Backend tự giới hạn phạm vi:
 * MANAGER chỉ thấy đơn chọn tòa mình và đơn "tòa nào cũng được" hợp giới tính tòa.
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

  function openDetail(registration: RegistrationListItem) {
    setSelected(registration)
    setDetailOpen(true)
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
      meta: { className: 'w-20 text-right' },
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => openDetail(row.original)}>
          <Eye />
          Xem
        </Button>
      ),
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
              allLabel="Các trạng thái"
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
      />
    </>
  )
}
