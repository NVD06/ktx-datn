import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { BackLink } from '@/components/shared/BackLink'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/QueryState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useBuildings } from '@/features/buildings/hooks/useBuildings'
import { toDateInput } from '@/lib/date-input'
import { formatDate } from '@/lib/format'
import { HYGIENE_WARNING_SCORE, hygieneScore } from '@/lib/labels'
import type { HygieneSheet } from '@/types/hygiene'
import { useHygieneSheet, useSaveHygiene } from '../hooks/useHygiene'

const BUILDING_PARAMS = { limit: 100, sortBy: 'name', order: 'asc' } as const
const FIELDS = ['baseScore', 'deduction', 'note'] as const

type Field = (typeof FIELDS)[number]
type SheetRoom = HygieneSheet['rooms'][number]

/** Chấm điểm vệ sinh theo đợt (US-05.4): chọn tòa + ngày, nhập điểm hàng loạt từng phòng. */
export function HygieneScoringPage() {
  const buildings = useBuildings(BUILDING_PARAMS)
  const [buildingId, setBuildingId] = useState('')
  const [today] = useState(() => toDateInput(new Date().toISOString()))
  const [checkDate, setCheckDate] = useState(today)
  // Chưa chọn thì lấy tòa đầu tiên — Manager chỉ có đúng một tòa.
  const selectedId = buildingId || buildings.data?.data[0]?.id || null
  const sheet = useHygieneSheet(selectedId, checkDate)

  return (
    <>
      <BackLink to="/admin/hygiene">Bảng điểm vệ sinh</BackLink>
      <PageHeader
        title="Chấm điểm vệ sinh"
        description="Chọn tòa và ngày kiểm tra rồi nhập điểm từng phòng. Phòng đã chấm ngày đó thì lưu lại sẽ ghi đè."
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Select value={selectedId ?? ''} onValueChange={setBuildingId}>
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
      </div>

      {sheet.isError && <ErrorState error={sheet.error} />}
      {selectedId && sheet.isPending && <LoadingState />}
      {/* key: đổi tòa/ngày thì bỏ hết điểm đang nhập dở. */}
      {sheet.data && <ScoreTable key={`${selectedId}:${checkDate}`} sheet={sheet.data} checkDate={checkDate} />}
    </>
  )
}

/** Giá trị đã lưu của một ô — điền sẵn để chấm lại. */
function saved(room: SheetRoom, field: Field): string {
  if (!room.record) return ''
  const value = field === 'baseScore' ? room.record.score + room.record.deduction : room.record[field]
  return value === null ? '' : String(value)
}

const isScore = (n: number) => Number.isInteger(n) && n >= 0 && n <= 100
function scoreError(baseText: string, baseScore: number, deductionText: string, deduction: number, note: string) {
  if (baseText === '') return deductionText !== '' || note !== '' ? 'Chưa nhập điểm vệ sinh' : null
  if (!isScore(baseScore) || !isScore(deduction)) return 'Điểm phải là số nguyên 0–100'
  return deduction > baseScore ? 'Điểm trừ lớn hơn điểm vệ sinh' : null
}

function ScoreTable({ sheet: { building, rooms }, checkDate }: { sheet: HygieneSheet; checkDate: string }) {
  const save = useSaveHygiene()
  // Chỉ giữ ô đã sửa; ô chưa sửa lấy điểm đã lưu (nếu có).
  const [edits, setEdits] = useState<Record<string, Partial<Record<Field, string>>>>({})

  const rows = rooms
    .filter((room) => room.residents > 0 || room.record)
    .map((room) => {
      const value = (f: Field) => edits[room.id]?.[f] ?? saved(room, f)
      const [baseText, deductionText, note] = [value('baseScore'), value('deduction'), value('note').trim()]
      const baseScore = Number(baseText)
      const deduction = deductionText === '' ? 0 : Number(deductionText)
      const error = scoreError(baseText, baseScore, deductionText, deduction, note)
      const final = baseText !== '' && !error ? baseScore - deduction : null
      const record = final !== null ? { roomId: room.id, baseScore, deduction, note: note || null } : null
      // Chỉ lưu phòng có sửa — lưu lại phòng không đổi gì sẽ ghi đè người chấm.
      const changed = FIELDS.some((f) => value(f) !== saved(room, f))
      return { room, value, error, final, record: changed ? record : null }
    })
  const ready = rows.filter((r) => r.record)
  const emptyRooms = rooms.length - rows.length

  function submit() {
    save.mutate(
      { buildingId: building.id, checkDate, records: ready.map((r) => r.record!) },
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

  const edit = (roomId: string, field: Field, value: string) =>
    setEdits((d) => ({ ...d, [roomId]: { ...d[roomId], [field]: value } }))

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Không có phòng nào để chấm"
        description={`Ngày ${formatDate(checkDate)} tòa ${building.name} chưa có sinh viên ở.`}
      />
    )
  }

  return (
    <>
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phòng</TableHead>
                <TableHead className="text-right">Số SV</TableHead>
                <TableHead>Điểm vệ sinh (0–100)</TableHead>
                <TableHead>Điểm trừ</TableHead>
                <TableHead>Điểm cuối</TableHead>
                <TableHead>Ghi chú vi phạm</TableHead>
                <TableHead className="text-right">Đã lưu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ room, value, error, final }) => (
                <TableRow key={room.id}>
                  <TableCell className="font-medium">
                    {room.code} <span className="text-muted-foreground text-xs">· tầng {room.floor}</span>
                  </TableCell>
                  <TableCell className="text-right">{room.residents}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={value('baseScore')}
                      onChange={(e) => edit(room.id, 'baseScore', e.target.value)}
                      aria-label={`Điểm vệ sinh phòng ${room.code}`}
                      aria-invalid={!!error}
                      className="h-8 w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="0"
                      value={value('deduction')}
                      onChange={(e) => edit(room.id, 'deduction', e.target.value)}
                      aria-label={`Điểm trừ phòng ${room.code}`}
                      aria-invalid={!!error}
                      className="h-8 w-20"
                    />
                  </TableCell>
                  <TableCell>
                    {error ? (
                      <span className="text-destructive text-xs">{error}</span>
                    ) : (
                      <span className="font-medium tabular-nums">{final ?? '—'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={value('note')}
                      maxLength={500}
                      placeholder="Ví dụ: để rác qua đêm"
                      onChange={(e) => edit(room.id, 'note', e.target.value)}
                      aria-label={`Ghi chú phòng ${room.code}`}
                      className="h-8 min-w-56"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {room.record ? <StatusBadge {...hygieneScore(room.record.score)} /> : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Điểm cuối = điểm vệ sinh − điểm trừ, dưới {HYGIENE_WARNING_SCORE} điểm là cảnh báo. Phòng bỏ trống ô điểm
          vệ sinh sẽ không được lưu.
          {emptyRooms > 0 && ` ${emptyRooms} phòng không có sinh viên ở không cần chấm.`}
        </p>
        <Button onClick={submit} disabled={save.isPending || rows.some((r) => r.error) || ready.length === 0}>
          {save.isPending ? 'Đang lưu…' : `Lưu điểm ${ready.length} phòng`}
        </Button>
      </div>
    </>
  )
}
