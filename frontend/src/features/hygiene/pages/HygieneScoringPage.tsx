import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { BackLink } from '@/components/shared/BackLink'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchInput } from '@/components/shared/SearchInput'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/QueryState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useBuildings } from '@/features/buildings/hooks/useBuildings'
import { toDateInput } from '@/lib/date-input'
import { formatDate } from '@/lib/format'
import { HYGIENE_VIOLATIONS, HYGIENE_WARNING_SCORE } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { HygieneSheet, HygieneViolation } from '@/types/hygiene'
import { useHygieneSheet, useSaveHygiene } from '../hooks/useHygiene'

const BUILDING_PARAMS = { limit: 100, sortBy: 'name', order: 'asc' } as const
const VIOLATIONS = Object.entries(HYGIENE_VIOLATIONS) as [HygieneViolation, { label: string; points: number }][]
const ALL_FLOORS = 'all'

const points = (list: HygieneViolation[]) => list.reduce((sum, v) => sum + HYGIENE_VIOLATIONS[v].points, 0)
const sameSet = (a: HygieneViolation[], b: HygieneViolation[]) => a.length === b.length && a.every((v) => b.includes(v))
const weekday = (date: string) => new Intl.DateTimeFormat('vi-VN', { weekday: 'long' }).format(new Date(`${date}T00:00:00`))

/** Chấm điểm vệ sinh theo đợt (US-05.4): chọn tòa + ngày, bấm lỗi từng phòng — điểm trừ dồn trong tháng. */
export function HygieneScoringPage() {
  const buildings = useBuildings(BUILDING_PARAMS)
  const [buildingId, setBuildingId] = useState('')
  const [today] = useState(() => toDateInput(new Date().toISOString()))
  const [checkDate, setCheckDate] = useState(today)
  const [floor, setFloor] = useState(ALL_FLOORS)
  const [search, setSearch] = useState('')
  // Chưa chọn thì lấy tòa đầu tiên — Manager chỉ có đúng một tòa.
  const selectedId = buildingId || buildings.data?.data[0]?.id || null
  const sheet = useHygieneSheet(selectedId, checkDate)
  const floors = [...new Set(sheet.data?.rooms.map((r) => r.floor))]

  return (
    <>
      <BackLink to="/admin/hygiene">Bảng điểm vệ sinh</BackLink>
      <PageHeader
        title="Chấm điểm vệ sinh"
        description={`Đợt kiểm tra ${weekday(checkDate)} ${formatDate(checkDate)} · bấm vào lỗi để trừ điểm, bấm lại để bỏ. Điểm trừ dồn trong tháng, đầu tháng mỗi phòng 100 điểm.`}
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Select
          value={selectedId ?? ''}
          onValueChange={(id) => {
            setBuildingId(id)
            setFloor(ALL_FLOORS)
          }}
        >
          <SelectTrigger className="bg-card min-w-40" aria-label="Tòa nhà">
            <SelectValue placeholder="Chọn tòa nhà" />
          </SelectTrigger>
          <SelectContent position="popper">
            {buildings.data?.data.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                Tòa {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={checkDate}
          max={today}
          onChange={(e) => e.target.value && setCheckDate(e.target.value)}
          className="bg-card w-44"
          aria-label="Ngày kiểm tra"
        />
        <Select value={floor} onValueChange={setFloor}>
          <SelectTrigger className="bg-card min-w-32" aria-label="Tầng">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value={ALL_FLOORS}>Tất cả tầng</SelectItem>
            {floors.map((f) => (
              <SelectItem key={f} value={String(f)}>
                Tầng {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm mã phòng" />
      </div>

      {sheet.isError && <ErrorState error={sheet.error} />}
      {selectedId && sheet.isPending && <LoadingState />}
      {/* key: đổi tòa/ngày thì bỏ hết điểm đang nhập dở. */}
      {sheet.data && (
        <ScoreTable
          key={`${selectedId}:${checkDate}`}
          sheet={sheet.data}
          checkDate={checkDate}
          floor={floor}
          search={search}
        />
      )}
    </>
  )
}

function ScoreTable({
  sheet: { building, rooms },
  checkDate,
  floor,
  search,
}: {
  sheet: HygieneSheet
  checkDate: string
  floor: string
  search: string
}) {
  const save = useSaveHygiene()
  const [edits, setEdits] = useState<Record<string, HygieneViolation[]>>({})

  const rows = rooms
    .filter((room) => room.residents > 0 || room.record)
    .map((room) => {
      const saved = room.record?.violations ?? []
      const picked = edits[room.id] ?? saved
      const onFloor = floor === ALL_FLOORS || String(room.floor) === floor
      const changed = !sameSet(picked, saved)
      return {
        room,
        picked,
        onFloor,
        after: Math.max(0, room.scoreBefore - points(picked)),
        toSave: room.record ? changed : onFloor || changed,
      }
    })
  const ready = rows.filter((r) => r.toSave)
  const shown = rows.filter((r) => r.onFloor && r.room.code.toLowerCase().includes(search.toLowerCase()))
  const deducted = ready.filter((r) => r.picked.length > 0)

  function toggle(roomId: string, picked: HygieneViolation[], v: HygieneViolation) {
    setEdits((d) => ({ ...d, [roomId]: picked.includes(v) ? picked.filter((x) => x !== v) : [...picked, v] }))
  }

  function submit() {
    save.mutate(
      { buildingId: building.id, checkDate, records: ready.map((r) => ({ roomId: r.room.id, violations: r.picked })) },
      {
        onSuccess: ({ roomCount, warningCount }) => {
          setEdits({})
          const warning = warningCount > 0 ? ` ${warningCount} phòng dưới ${HYGIENE_WARNING_SCORE} điểm.` : ''
          toast.success(`Đã lưu điểm ${roomCount} phòng.${warning}`)
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Không có phòng nào để chấm"
        description={`Ngày ${formatDate(checkDate)} tòa ${building.name} chưa có sinh viên ở.`}
      />
    )
  }

  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phòng</TableHead>
              <TableHead>Điểm hiện tại</TableHead>
              <TableHead>Lỗi phát hiện trong đợt này</TableHead>
              <TableHead className="text-right">Sau đợt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-6 text-center">
                  Không có phòng nào khớp bộ lọc.
                </TableCell>
              </TableRow>
            )}
            {shown.map(({ room, picked, after }) => (
              <TableRow key={room.id}>
                <TableCell>
                  <p className="font-semibold">{room.code}</p>
                  {room.record && <p className="text-muted-foreground text-xs">đã chấm</p>}
                </TableCell>
                <TableCell className="tabular-nums">{room.scoreBefore}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {VIOLATIONS.map(([v, { label, points }]) => (
                      <button
                        key={v}
                        type="button"
                        aria-pressed={picked.includes(v)}
                        onClick={() => toggle(room.id, picked, v)}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-xs transition-colors',
                          picked.includes(v) ? 'tone-danger font-medium' : 'bg-card hover:bg-muted',
                        )}
                      >
                        {label} −{points}
                      </button>
                    ))}
                  </div>
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right font-semibold tabular-nums',
                    after < HYGIENE_WARNING_SCORE ? 'text-(--tone-danger-fg)' : 'text-(--tone-success-fg)',
                  )}
                >
                  {after}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-muted-foreground text-sm">
            Đợt này:{' '}
            <strong className="text-foreground">
              {deducted.length} phòng bị trừ · tổng −{deducted.reduce((sum, r) => sum + points(r.picked), 0)} điểm
            </strong>
            . Dưới {HYGIENE_WARNING_SCORE} điểm là cảnh báo.
          </p>
          <Button onClick={submit} disabled={save.isPending || ready.length === 0}>
            {save.isPending ? 'Đang lưu…' : `Lưu đợt chấm · ${ready.length} phòng`}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
