import type { ColumnDef } from '@tanstack/react-table'
import { FileSpreadsheet, KeyRound, Lock, LockOpen, Plus, Trash2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
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
import { CreateStudentDialog } from '../components/CreateStudentDialog'
import { ImportStudentsDialog } from '../components/ImportStudentsDialog'
import { useDeleteUser, useResetStudentPassword, useSetUserActive, useUsers } from '../hooks/useUsers'

const ROLE_OPTIONS = toOptions(ROLE)

/**
 * Tài khoản của hệ thống (US-01.6, chỉ ADMIN): cấp tài khoản sinh viên (từng người hoặc nhập
 * Excel), tạo tài khoản quản lý, khóa/mở khóa, đặt lại mật khẩu sinh viên, xóa tài khoản chưa có
 * lịch sử. Sinh viên không tự đăng ký; không có đổi vai trò hay tạo thêm ADMIN.
 */
export function UserListPage() {
  const { user: me } = useAuth()
  const list = useListParams(['role', 'isActive'] as const)
  const query = useUsers(list.params)
  const setActive = useSetUserActive()
  const resetPassword = useResetStudentPassword()
  const deleteUser = useDeleteUser()

  const [createOpen, setCreateOpen] = useState(false)
  const [studentOpen, setStudentOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [toggling, setToggling] = useState<UserSummary | null>(null)
  const [resetting, setResetting] = useState<UserSummary | null>(null)
  const [deleting, setDeleting] = useState<UserSummary | null>(null)

  const columns: ColumnDef<UserSummary>[] = [
    {
      id: 'fullName',
      header: 'Họ tên',
      enableSorting: true,
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.fullName}</p>
          <p className="text-muted-foreground text-xs">
            {row.original.email}
            {row.original.profile && ` · ${row.original.profile.studentCode}`}
          </p>
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
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge {...accountStatus(row.original.isActive)} />
          {row.original.mustChangePassword && <StatusBadge label="Chưa đổi mật khẩu" tone="warning" />}
        </div>
      ),
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
              ...(row.original.profile
                ? [{ label: 'Đặt lại mật khẩu', icon: KeyRound, onSelect: () => setResetting(row.original) }]
                : []),
              row.original.isActive
                ? { label: 'Khóa tài khoản', icon: Lock, destructive: true, onSelect: () => setToggling(row.original) }
                : { label: 'Mở khóa', icon: LockOpen, onSelect: () => setToggling(row.original) },
              // Không xóa tài khoản quản trị viên (backend cũng chặn).
              ...(row.original.role === 'ADMIN'
                ? []
                : [{ label: 'Xóa tài khoản', icon: Trash2, destructive: true, onSelect: () => setDeleting(row.original) }]),
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
        description="Tài khoản trong hệ thống. Sinh viên không tự đăng ký: quản trị viên cấp tài khoản, mật khẩu ban đầu là mã sinh viên."
        actions={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet />
              Nhập Excel
            </Button>
            <Button variant="outline" onClick={() => setStudentOpen(true)}>
              <UserPlus />
              Thêm sinh viên
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus />
              Thêm quản lý
            </Button>
          </>
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
            <SearchInput value={list.search} onChange={list.setSearch} placeholder="Tìm theo tên, email, mã SV" />
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
      <CreateStudentDialog open={studentOpen} onOpenChange={setStudentOpen} />
      <ImportStudentsDialog open={importOpen} onOpenChange={setImportOpen} />

      <ConfirmDialog
        target={deleting}
        onClose={() => setDeleting(null)}
        title="Xóa tài khoản?"
        description={(u) => (
          <>
            Xóa vĩnh viễn tài khoản <strong>{u.fullName}</strong> ({u.email}). Chỉ xóa được tài khoản chưa có đơn
            đăng ký, hợp đồng hay lịch sử xử lý — tài khoản đã có thì hãy khóa thay vì xóa.
            {u.building && ` Tòa ${u.building.name} sẽ không còn người quản lý.`}
          </>
        )}
        confirmLabel="Xóa tài khoản"
        cancelLabel="Giữ lại"
        isPending={deleteUser.isPending}
        onConfirm={(u) => deleteUser.mutateAsync(u.id).then(() => toast.success(`Đã xóa tài khoản ${u.fullName}`))}
      />

      <ConfirmDialog
        target={resetting}
        onClose={() => setResetting(null)}
        title="Đặt lại mật khẩu?"
        description={(u) => (
          <>
            Đặt lại mật khẩu của <strong>{u.fullName}</strong> về mã sinh viên{' '}
            <strong>{u.profile?.studentCode}</strong>. Sinh viên phải đổi mật khẩu ở lần đăng nhập kế tiếp.
          </>
        )}
        confirmLabel="Đặt lại"
        destructive={false}
        isPending={resetPassword.isPending}
        onConfirm={(u) =>
          resetPassword
            .mutateAsync(u.id)
            .then(() => toast.success(`Đã đặt lại mật khẩu của ${u.fullName} về mã sinh viên`))
        }
      />

      <ConfirmDialog
        target={toggling}
        onClose={() => setToggling(null)}
        title={toggling?.isActive ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'}
        description={(u) =>
          u.isActive ? (
            <>
              Khóa tài khoản <strong>{u.fullName}</strong> ({u.email}). Người này bị đăng xuất ở thao tác
              kế tiếp và không đăng nhập lại được.
              {u.building &&
                ` Tòa ${u.building.name} vẫn gán cho người này — gỡ ở mục Tòa nhà nếu muốn giao cho người khác.`}
            </>
          ) : (
            <>
              Mở khóa tài khoản <strong>{u.fullName}</strong> ({u.email}). Người này đăng nhập lại được ngay.
            </>
          )
        }
        confirmLabel={toggling?.isActive ? 'Khóa' : 'Mở khóa'}
        destructive={!!toggling?.isActive}
        isPending={setActive.isPending}
        onConfirm={(u) =>
          setActive
            .mutateAsync({ id: u.id, isActive: !u.isActive })
            .then(() => toast.success(u.isActive ? `Đã khóa tài khoản ${u.fullName}` : `Đã mở khóa tài khoản ${u.fullName}`))
        }
      />
    </>
  )
}
