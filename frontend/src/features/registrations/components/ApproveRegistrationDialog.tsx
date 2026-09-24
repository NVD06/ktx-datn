import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorCode, getErrorMessage, getFieldErrors } from '@/api/client'
import { FilterSelect } from '@/components/shared/FilterSelect'
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
import { useAvailableBeds } from '@/features/rooms/hooks/useRooms'
import { formatDateRange, formatMoney } from '@/lib/format'
import { GENDER } from '@/lib/labels'
import type { AvailableRoom } from '@/types/facility'
import type { RegistrationListItem } from '@/types/registration'
import { useApproveRegistration } from '../hooks/useRegistrations'

/**
 * 409 mang các mã này nghĩa là danh sách giường đang xem đã cũ (giường vừa bị
 * người khác lấy, phòng vừa có người khác giới, phòng vừa ngừng hoạt động) —
 * bỏ lựa chọn để Manager chọn lại trên danh sách mới (hook tự tải lại).
 */
const STALE_BED_ERRORS = new Set(['BED_TAKEN', 'ROOM_GENDER_MISMATCH', 'ROOM_UNAVAILABLE'])

interface Props {
  /** Đơn đang duyệt; null = đóng. */
  registration: RegistrationListItem | null
  onClose: () => void
}

/**
 * Duyệt đơn + xếp giường (US-03.1, US-03.2).
 *
 * Danh sách chỉ gồm giường backend cho là xếp được: hợp giới tính SV, đúng
 * nguyện vọng tòa (bắt buộc), Manager chỉ thấy tòa mình. Nguyện vọng loại phòng
 * chỉ là bộ lọc mặc định — loại SV muốn đã hết chỗ thì Manager chọn loại khác.
 * Backend kiểm tra lại mọi điều kiện khi bấm duyệt.
 */
export function ApproveRegistrationDialog({ registration, onClose }: Props) {
  return (
    <Dialog open={!!registration} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        {registration && <ApproveContent registration={registration} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

interface Selection {
  bedId: string
  bedCode: string
  room: AvailableRoom
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()]
}

function ApproveContent({
  registration: r,
  onDone,
}: {
  registration: RegistrationListItem
  onDone: () => void
}) {
  const gender = r.student.profile?.gender ?? null
  const beds = useAvailableBeds(
    gender ? { gender, ...(r.building ? { buildingId: r.building.id } : {}) } : null,
  )
  const approve = useApproveRegistration()

  const preferred = r.preferredRoomType
  const [buildingId, setBuildingId] = useState('')
  const [roomTypeId, setRoomTypeId] = useState(preferred?.id ?? '')
  const [selected, setSelected] = useState<Selection | null>(null)

  const rooms = beds.data ?? []
  const buildingOptions = uniqueById(rooms.map((room) => room.building)).map((b) => ({
    value: b.id,
    label: `Tòa ${b.name}`,
  }))
  // Loại SV muốn luôn có trong bộ lọc, kể cả khi đã hết chỗ — để thấy rõ là hết.
  const roomTypeOptions = uniqueById([...(preferred ? [preferred] : []), ...rooms.map((room) => room.roomType)]).map(
    (t) => ({ value: t.id, label: t.name }),
  )
  const visible = rooms.filter(
    (room) =>
      (!buildingId || room.building.id === buildingId) &&
      (!roomTypeId || room.roomType.id === roomTypeId),
  )
  const bedCount = visible.reduce((sum, room) => sum + room.beds.length, 0)
  const typeMismatch = !!selected && !!preferred && selected.room.roomType.id !== preferred.id

  function changeFilter(set: (value: string) => void) {
    return (value: string) => {
      set(value)
      setSelected(null)
    }
  }

  function submit() {
    if (!selected) return
    approve.mutate(
      { id: r.id, bedId: selected.bedId },
      {
        onSuccess(contract) {
          const { bed } = contract
          toast.success(
            `Đã duyệt đơn của ${r.student.fullName}: giường ${bed.code} phòng ${bed.room.code} ` +
              `tòa ${bed.room.building.name}. Hợp đồng ${contract.code} chờ sinh viên ký.`,
          )
          onDone()
        },
        onError(error) {
          const code = getErrorCode(error)
          toast.error(getFieldErrors(error)?.bedId?.[0] ?? getErrorMessage(error))
          if (code && STALE_BED_ERRORS.has(code)) setSelected(null)
          // Người khác vừa duyệt/từ chối đơn này — không còn gì để làm ở đây.
          if (code === 'REGISTRATION_NOT_PENDING') onDone()
        },
      },
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Duyệt đơn và xếp giường</DialogTitle>
        <DialogDescription>
          Hợp đồng được lập ở trạng thái chờ ký, giá lấy theo loại phòng của giường được chọn.
        </DialogDescription>
      </DialogHeader>

      <dl className="bg-muted/50 grid gap-3 rounded-md border p-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground text-xs">Sinh viên</dt>
          <dd className="font-medium">{r.student.fullName}</dd>
          <dd className="text-muted-foreground text-xs">
            {r.student.profile
              ? `${r.student.profile.studentCode} · ${GENDER[r.student.profile.gender].label}`
              : r.student.email}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Nguyện vọng</dt>
          <dd className="font-medium">{r.building ? `Tòa ${r.building.name}` : 'Tòa nào cũng được'}</dd>
          <dd className="text-muted-foreground text-xs">{preferred?.name ?? 'Loại nào cũng được'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-xs">Thời gian ở ({r.period.name})</dt>
          <dd className="font-medium">{formatDateRange(r.period.stayStartAt, r.period.stayEndAt)}</dd>
        </div>
      </dl>

      {!gender ? (
        <ErrorState error={new Error('Hồ sơ sinh viên chưa có giới tính nên chưa xếp được phòng.')} />
      ) : beds.isPending ? (
        <LoadingState label="Đang tìm giường trống…" />
      ) : beds.isError ? (
        <ErrorState error={beds.error} />
      ) : rooms.length === 0 ? (
        <EmptyState
          title="Không còn giường phù hợp"
          description={
            `Không còn giường trống cho sinh viên ${GENDER[gender].label.toLowerCase()}` +
            (r.building ? ` ở tòa ${r.building.name}` : '') +
            '. Có thể từ chối đơn hoặc chờ có người trả phòng.'
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {buildingOptions.length > 1 && (
              <FilterSelect
                value={buildingId}
                onChange={changeFilter(setBuildingId)}
                options={buildingOptions}
                allLabel="Mọi tòa"
              />
            )}
            <FilterSelect
              value={roomTypeId}
              onChange={changeFilter(setRoomTypeId)}
              options={roomTypeOptions}
              allLabel="Mọi loại phòng"
            />
            <span className="text-muted-foreground ml-auto text-xs">
              {beds.isFetching ? 'Đang cập nhật…' : `${bedCount} giường trống`}
            </span>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              title={
                roomTypeId === preferred?.id
                  ? `Loại "${preferred.name}" đã hết chỗ`
                  : 'Không có giường trống theo bộ lọc'
              }
              description="Nguyện vọng loại phòng chỉ để tham khảo — có thể xếp loại phòng khác."
              action={
                <Button variant="outline" size="sm" onClick={() => changeFilter(setRoomTypeId)('')}>
                  Xem mọi loại phòng
                </Button>
              }
            />
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {visible.map((room) => (
                <li key={room.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
                    <span className="font-medium">
                      Phòng {room.code}
                      {buildingOptions.length > 1 && ` · Tòa ${room.building.name}`}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      Tầng {room.floor} · {room.roomType.name} · {formatMoney(room.roomType.price)} / kỳ
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {room.beds.map((bed) => {
                      const isSelected = selected?.bedId === bed.id
                      return (
                        <Button
                          key={bed.id}
                          type="button"
                          size="sm"
                          variant={isSelected ? 'default' : 'outline'}
                          className="min-w-12"
                          aria-pressed={isSelected}
                          onClick={() => setSelected({ bedId: bed.id, bedCode: bed.code, room })}
                        >
                          {bed.code}
                        </Button>
                      )
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selected && (
        <div className="space-y-2 text-sm">
          <p>
            Xếp vào{' '}
            <span className="font-medium">
              giường {selected.bedCode} · phòng {selected.room.code} · tòa {selected.room.building.name}
            </span>
            , giá hợp đồng {formatMoney(selected.room.roomType.price)} / kỳ.
          </p>
          {typeMismatch && (
            <p className="tone-warning rounded-md border p-2 text-xs">
              Sinh viên muốn loại "{preferred.name}" ({formatMoney(preferred.price)} / kỳ), giường đã
              chọn thuộc loại "{selected.room.roomType.name}".
            </p>
          )}
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={approve.isPending}>
          Hủy
        </Button>
        <Button onClick={submit} disabled={!selected || approve.isPending}>
          {approve.isPending ? 'Đang duyệt…' : 'Duyệt và xếp giường'}
        </Button>
      </DialogFooter>
    </>
  )
}
