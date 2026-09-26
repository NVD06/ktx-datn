import type { ColumnDef } from '@tanstack/react-table'
import { Lock, LockOpen, Plus } from 'lucide-react'
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
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useListParams } from '@/hooks/useListParams'
import { formatDate, orDash } from '@/lib/format'
import { ACCOUNT_OPTIONS, ROLE, accountStatus, toOptions } from '@/lib/labels'
import type { UserSummary } from '@/types/user'
import { CreateManagerDialog } from '../components/CreateManagerDialog'
import { useSetUserActive, useUsers } from '../hooks/useUsers'

const ROLE_OPTIONS = toOptions(ROLE)

/**
 * Tài khoản của hệ thống (US-01.6, chỉ ADMIN): tạo tài khoản quản lý, khóa/mở khóa.
 * Sinh viên vẫn tự đăng ký; không có đổi vai trò hay tạo thêm ADMIN.
 */
export function UserListPage() {
  const { user: me } = useAuth()
  const list = useListParams(['role', 'isActive'] as const)
  const query = useUsers(list.params)
  const setActive = useSetUserActive()

  const [createOpen, setCreateOpen] = useState(false)
  const [toggling, setToggling] = useState<UserSummary | null>(null)

  function confirmToggle() {
    if (!toggling) return
    const { id, fullName, isActive } = toggling
    setActive.mutate(
      { id, isActive: !isActive },
      {
        onSuccess: () => toast.success(isActive ? `Đã khóa tài khoản ${fullName}` : `Đã mở khóa tài khoản ${fullName}`),
        onError: (error) => toast.error(getErrorMessage(error)),
        onSettled: () => setToggling(null),
      },
    )
  }

  const columns: ColumnDef<UserSummary>[] = [
    {
      id: 'fullName',
      header: 'Họ tên',
      enableSorting: true,
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.fullName}</p>
          <p className="text-muted-foreground text-xs">{row.original.email}</p>
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Vai trò',
      cell: ({ row }) => <StatusBadge {...ROLE[row.original.role]} />,
    },
    {
      id: 'building',
      header: 'Tòa quản lý',
      cell: ({ row }) => orDash(row.original.building && `Tòa ${row.original.building.name}`),
    },
    {
      id: 'phone',
      header: 'Số điện thoại',
      cell: ({ row }) => orDash(row.original.phone),
    },
    {
      id: 'isActive',
      header: 'Trạng thái',
      cell: ({ row }) => <StatusBadge {...accountStatus(row.original.isActive)} />,
    },
    {
      id: 'createdAt',
      header: 'Ngày tạo',
      enableSorting: true,
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: 'actions',
      header: '',
      meta: { className: 'w-12 text-right' },
      // Không tự khóa chính mình (backend cũng chặn).
      cell: ({ row }) =>
        row.original.id !== me?.id && (
          <RowActions
            actions={[
              row.original.isActive
                ? { label: 'Khóa tài khoản', icon: Lock, destructive: true, onSelect: () => setToggling(row.original) }
                : { label: 'Mở khóa', icon: LockOpen, onSelect: () => setToggling(row.original) },
            ]}
          />
        ),
    },
  ]

  const filtered = !!(list.search || list.filters.role || list.filters.isActive)

  return (
    <>
      <PageHeader
        title="Người dùng"
        description="Tài khoản trong hệ thống. Quản trị viên tạo tài khoản quản lý; sinh viên tự đăng ký."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            Thêm quản lý
          </Button>
        }
      />

      <DataTable
        columns={columns}
        query={query}
        list={list}
        emptyTitle="Không có tài khoản nào"
        emptyDescription={filtered ? 'Thử bỏ bớt bộ lọc.' : undefined}
        toolbar={
          <>
            <SearchInput value={list.search} onChange={list.setSearch} placeholder="Tìm theo tên, email" />
            <FilterSelect
              value={list.filters.role}
              onChange={(v) => list.setFilter('role', v)}
              options={ROLE_OPTIONS}
              allLabel="Vai trò"
            />
            <FilterSelect
              value={list.filters.isActive}
              onChange={(v) => list.setFilter('isActive', v)}
              options={ACCOUNT_OPTIONS}
              allLabel="Trạng thái"
            />
          </>
        }
      />

      <CreateManagerDialog open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmDialog
        open={!!toggling}
        onOpenChange={(open) => !open && setToggling(null)}
        title={toggling?.isActive ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'}
        description={
          toggling?.isActive ? (
            <>
              Khóa tài khoản <strong>{toggling.fullName}</strong> ({toggling.email}). Người này bị đăng xuất
              ở thao tác kế tiếp và không đăng nhập lại được.
              {toggling.building &&
                ` Tòa ${toggling.building.name} vẫn gán cho người này — gỡ ở mục Tòa nhà nếu muốn giao cho người khác.`}
            </>
          ) : (
            <>
              Mở khóa tài khoản <strong>{toggling?.fullName}</strong> ({toggling?.email}). Người này đăng nhập
              lại được ngay.
            </>
          )
        }
        confirmLabel={toggling?.isActive ? 'Khóa' : 'Mở khóa'}
        destructive={!!toggling?.isActive}
        isPending={setActive.isPending}
        onConfirm={confirmToggle}
      />
    </>
  )
}
