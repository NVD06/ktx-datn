import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/QueryState'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAssignManager, useManagers } from '@/features/users/hooks/useUsers'
import type { Building } from '@/types/facility'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  building: Pick<Building, 'id' | 'name' | 'isActive'> | null
}

/**
 * Gán / gỡ quản lý của một tòa (ADMIN).
 *
 * Mỗi Manager thuộc đúng một tòa (`User.buildingId`), nên gán một người đang
 * quản lý tòa khác sang đây nghĩa là chuyển họ khỏi tòa cũ.
 */
export function AssignManagerDialog({ open, onOpenChange, building }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {building && <AssignManagerContent building={building} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function AssignManagerContent({
  building,
  onDone,
}: {
  building: NonNullable<Props['building']>
  onDone: () => void
}) {
  const managers = useManagers()
  const assign = useAssignManager()
  const [selectedId, setSelectedId] = useState('')

  // Đọc từ danh sách người dùng (không từ `building.managers`) để thấy ngay
  // kết quả sau mỗi lần gán/gỡ — danh sách này được làm mới sau mutation.
  const all = managers.data?.data ?? []
  const current = all.filter((m) => m.buildingId === building.id)
  // Tài khoản đã khóa không gán được (backend trả 409) — vẫn hiện ở "Đang quản lý" để gỡ ra.
  const candidates = all.filter((m) => m.buildingId !== building.id && m.isActive)
  const selected = candidates.find((m) => m.id === selectedId)

  function change(userId: string, buildingId: string | null, success: string) {
    assign.mutate(
      { userId, buildingId },
      {
        onSuccess() {
          toast.success(success)
          setSelectedId('')
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Quản lý tòa {building.name}</DialogTitle>
        <DialogDescription>
          Mỗi quản lý phụ trách đúng một tòa. Quản lý chỉ xem và thao tác được dữ liệu của tòa được
          gán.
        </DialogDescription>
      </DialogHeader>

      {managers.isPending && <LoadingState />}
      {managers.isError && <ErrorState error={managers.error} />}

      {managers.isSuccess && (
        <div className="space-y-5">
          <section className="space-y-2">
            <h3 className="text-sm font-medium">Đang quản lý</h3>
            {current.length === 0 ? (
              <EmptyState title="Chưa có quản lý nào" />
            ) : (
              <ul className="divide-y rounded-lg border">
                {current.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {m.fullName}
                        {!m.isActive && (
                          <span className="text-muted-foreground font-normal"> (đã khóa)</span>
                        )}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">{m.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={assign.isPending}
                      onClick={() => change(m.id, null, `Đã gỡ ${m.fullName} khỏi tòa ${building.name}`)}
                    >
                      Gỡ
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Gán thêm quản lý</h3>
            {!building.isActive ? (
              <p className="text-muted-foreground text-sm">
                Tòa đang ngừng hoạt động nên không thể gán quản lý.
              </p>
            ) : candidates.length === 0 ? (
              <p className="text-muted-foreground text-sm">Không còn tài khoản quản lý nào khác.</p>
            ) : (
              <>
                <div className="flex gap-2">
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger className="min-w-0 flex-1">
                      <SelectValue placeholder="Chọn tài khoản quản lý" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {candidates.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.fullName} — {m.building ? `đang quản lý ${m.building.name}` : 'chưa gán tòa'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    disabled={!selected || assign.isPending}
                    onClick={() =>
                      selected &&
                      change(selected.id, building.id, `Đã gán ${selected.fullName} vào tòa ${building.name}`)
                    }
                  >
                    Gán
                  </Button>
                </div>
                {selected?.building && (
                  <p className="tone-warning rounded-md border p-2 text-xs">
                    {selected.fullName} sẽ thôi quản lý tòa {selected.building.name}.
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Đóng
        </Button>
      </DialogFooter>
    </>
  )
}
