import type { ColumnDef } from '@tanstack/react-table'
import { Eye, Pencil, Plus, Trash2, UserCog } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DataTable } from '@/components/shared/DataTable'
import { FilterSelect } from '@/components/shared/FilterSelect'
import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions, type RowAction } from '@/components/shared/RowActions'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useListParams } from '@/hooks/useListParams'
import { ACTIVE_STATUS, GENDER, MIXED_GENDER } from '@/lib/labels'
import type { Building } from '@/types/facility'
import { AssignManagerDialog } from '../components/AssignManagerDialog'
import { BuildingFormDialog } from '../components/BuildingFormDialog'
import { useBuildings, useDeleteBuilding } from '../hooks/useBuildings'

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Tòa nam' },
  { value: 'FEMALE', label: 'Tòa nữ' },
]

const ACTIVE_OPTIONS = [
  { value: 'true', label: 'Đang hoạt động' },
  { value: 'false', label: 'Ngừng hoạt động' },
]

/**
 * Danh sách tòa nhà. ADMIN thấy tất cả và được thêm/sửa/xóa/gán quản lý;
 * MANAGER chỉ thấy tòa của mình (backend lọc bằng buildingScope).
 */
export function BuildingListPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const navigate = useNavigate()

  const list = useListParams(['gender', 'isActive'] as const)
  const query = useBuildings(list.params)
  const remove = useDeleteBuilding()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Building | null>(null)
  const [assigning, setAssigning] = useState<Building | null>(null)
  const [deleting, setDeleting] = useState<Building | null>(null)

  function openForm(building: Building | null) {
    setEditing(building)
    setFormOpen(true)
  }

  function confirmDelete() {
    if (!deleting) return
    const { id, name } = deleting
    remove.mutate(id, {
      onSuccess: () => toast.success(`Đã xóa tòa nhà ${name}`),
      onError: (error) => toast.error(getErrorMessage(error)),
      onSettled: () => setDeleting(null),
    })
  }

  const columns: ColumnDef<Building>[] = [
    {
      id: 'name',
      header: 'Tòa nhà',
      enableSorting: true,
      cell: ({ row }) => (
        <div className="max-w-72 whitespace-normal">
          <Link
            to={`/admin/buildings/${row.original.id}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {row.original.name}
          </Link>
          {row.original.description && (
            <p className="text-muted-foreground line-clamp-1 text-xs">{row.original.description}</p>
          )}
        </div>
      ),
    },
    {
      id: 'floors',
      header: 'Số tầng',
      enableSorting: true,
      meta: { className: 'text-right' },
      cell: ({ row }) => row.original.floors,
    },
    {
      id: 'gender',
      header: 'Giới tính',
      cell: ({ row }) => {
        const gender = row.original.gender ? GENDER[row.original.gender] : MIXED_GENDER
        return <StatusBadge label={gender.label} tone={gender.tone} />
      },
    },
    {
      id: 'managers',
      header: 'Quản lý',
      cell: ({ row }) =>
        row.original.managers.length > 0 ? (
          <span className="whitespace-normal">
            {row.original.managers.map((m) => m.fullName).join(', ')}
          </span>
        ) : (
          <span className="text-muted-foreground">Chưa gán</span>
        ),
    },
    {
      id: 'roomCount',
      header: 'Số phòng',
      meta: { className: 'text-right' },
      cell: ({ row }) => row.original.roomCount,
    },
    {
      id: 'isActive',
      header: 'Trạng thái',
      cell: ({ row }) => {
        const status = ACTIVE_STATUS[row.original.isActive ? 'ACTIVE' : 'INACTIVE']
        return <StatusBadge label={status.label} tone={status.tone} />
      },
    },
    {
      id: 'actions',
      header: '',
      meta: { className: 'w-12 text-right' },
      cell: ({ row }) => {
        const building = row.original
        const actions: RowAction[] = [
          {
            label: 'Xem phòng',
            icon: Eye,
            onSelect: () => void navigate(`/admin/buildings/${building.id}`),
          },
        ]
        if (isAdmin) {
          actions.push(
            { label: 'Sửa', icon: Pencil, onSelect: () => openForm(building) },
            { label: 'Gán quản lý', icon: UserCog, onSelect: () => setAssigning(building) },
            { label: 'Xóa', icon: Trash2, destructive: true, onSelect: () => setDeleting(building) },
          )
        }
        return <RowActions actions={actions} />
      },
    },
  ]

  return (
    <>
      <PageHeader
        title="Tòa nhà"
        description={
          query.data ? `${query.data.meta.total} tòa trong phạm vi của bạn` : undefined
        }
        actions={
          isAdmin && (
            <Button onClick={() => openForm(null)}>
              <Plus />
              Thêm tòa nhà
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={query.data?.data}
        meta={query.data?.meta}
        isLoading={query.isPending}
        isFetching={query.isFetching}
        error={query.error}
        sortBy={list.sortBy}
        order={list.order}
        onSortChange={list.setSort}
        onPageChange={list.setPage}
        emptyTitle="Không có tòa nhà nào"
        toolbar={
          <>
            <SearchInput value={list.search} onChange={list.setSearch} placeholder="Tìm theo tên tòa" />
            <FilterSelect
              value={list.filters.gender}
              onChange={(v) => list.setFilter('gender', v)}
              options={GENDER_OPTIONS}
              allLabel="Mọi giới tính"
            />
            <FilterSelect
              value={list.filters.isActive}
              onChange={(v) => list.setFilter('isActive', v)}
              options={ACTIVE_OPTIONS}
              allLabel="Mọi trạng thái"
            />
          </>
        }
      />

      <BuildingFormDialog open={formOpen} onOpenChange={setFormOpen} building={editing} />

      <AssignManagerDialog
        open={!!assigning}
        onOpenChange={(open) => !open && setAssigning(null)}
        building={assigning}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Xóa tòa nhà?"
        description={
          <>
            Xóa tòa nhà <strong>{deleting?.name}</strong>. Chỉ xóa được tòa chưa có phòng và chưa gán
            quản lý — nếu không, hãy chuyển tòa sang ngừng hoạt động.
          </>
        }
        isPending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </>
  )
}
