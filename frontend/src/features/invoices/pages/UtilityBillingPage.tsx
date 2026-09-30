import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/client'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
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
import { formatMoney } from '@/lib/format'
import type { MeterReading, UtilitySheet } from '@/types/invoice'
import { useBillUtilities, useCancelUtility, useUtilitySheet } from '../hooks/useInvoices'

const BUILDING_PARAMS = { limit: 100, sortBy: 'name', order: 'asc' } as const
const FIELDS = [
  ['electricOld', 'Điện cũ'],
  ['electricNew', 'Điện mới'],
  ['waterOld', 'Nước cũ'],
  ['waterNew', 'Nước mới'],
] as const
const SKIP_TEXT = { BILLED: 'đã chốt trước đó', EMPTY: 'không còn sinh viên ở', NO_USAGE: 'không dùng điện nước' }
const CANCEL_BLOCK_TEXT = { PAID: 'Đã có SV thanh toán', LATER_BILLED: 'Đã chốt tháng sau' }

type Field = (typeof FIELDS)[number][0]
type SheetRoom = UtilitySheet['rooms'][number]

/** Chốt điện nước hàng tháng (US-04.2) — Manager chỉ thấy tòa mình. */
export function UtilityBillingPage() {
  const buildings = useBuildings(BUILDING_PARAMS)
  const [buildingId, setBuildingId] = useState('')
  const [thisMonth] = useState(() => toDateInput(new Date().toISOString()).slice(0, 7))
  const [period, setPeriod] = useState(thisMonth)
  // Chưa chọn thì lấy tòa đầu tiên — Manager chỉ có đúng một tòa.
  const selectedId = buildingId || buildings.data?.data[0]?.id || null
  const sheet = useUtilitySheet(selectedId, period)

  return (
    <>
      <PageHeader
        title="Chốt điện nước"
        description="Nhập chỉ số điện, nước của cả phòng theo tháng — tiền chia đều cho sinh viên đang ở."
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
          type="month"
          value={period}
          max={thisMonth}
          onChange={(e) => e.target.value && setPeriod(e.target.value)}
          className="bg-card w-44"
          aria-label="Tháng"
        />
      </div>

      {sheet.isError && <ErrorState error={sheet.error} />}
      {selectedId && sheet.isPending && <LoadingState />}
      {/* key: đổi tòa/tháng thì bỏ hết số đang nhập dở. */}
      {sheet.data && <ReadingTable key={`${selectedId}:${period}`} sheet={sheet.data} />}
    </>
  )
}

function ReadingTable({ sheet: { building, period, prices, rooms } }: { sheet: UtilitySheet }) {
  const bill = useBillUtilities()
  const cancel = useCancelUtility()
  // Chỉ giữ ô đã sửa; ô chưa sửa lấy chỉ số cũ gợi ý từ lần chốt trước.
  const [edits, setEdits] = useState<Record<string, Partial<Record<Field, string>>>>({})
  const [cancelling, setCancelling] = useState<SheetRoom | null>(null)

  const rows = rooms
    .filter((room) => room.residents > 0 || room.billed)
    .map((room) => {
      const value = (f: Field) => edits[room.id]?.[f] ?? String(room.prefill?.[f] ?? '')
      const texts = FIELDS.map(([f]) => value(f))
      const numbers = texts.map(Number)
      const [electricOld = 0, electricNew = 0, waterOld = 0, waterNew = 0] = numbers
      const filled = !room.billed && texts.every((t) => t !== '')
      const invalid =
        filled &&
        (numbers.some((x) => !Number.isInteger(x) || x < 0) || electricNew < electricOld || waterNew < waterOld)
      const reading = filled && !invalid ? { electricOld, electricNew, waterOld, waterNew } : null
      return { room, value, invalid, reading }
    })
  const ready = rows.filter((r) => r.reading)
  const emptyRooms = rooms.filter((room) => room.residents === 0 && !room.billed).map((room) => room.code)

  /** Phần mỗi SV trả — cùng cách tính với backend: chia ở từng khoản rồi làm tròn. */
  const share = (r: MeterReading, n: number) =>
    Math.round(((r.electricNew - r.electricOld) * prices.electric) / n) +
    Math.round(((r.waterNew - r.waterOld) * prices.water) / n)

  function submit() {
    const readings = ready.map(({ room, reading }) => ({ roomId: room.id, ...reading! }))
    bill.mutate(
      { buildingId: building.id, period, readings },
      {
        onSuccess: ({ invoiceCount, roomCount, skipped }) => {
          const skip = skipped.map((s) => `${s.code} (${SKIP_TEXT[s.reason]})`).join(', ')
          toast.success(`Đã lập ${invoiceCount} hóa đơn cho ${roomCount} phòng.${skip && ` Bỏ qua: ${skip}.`}`)
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  async function confirmCancel(room: SheetRoom) {
    const { invoiceCount, reading } = await cancel.mutateAsync({ roomId: room.id, period })
    // Điền lại chỉ số vừa hủy — chỉ cần sửa ô nhập sai rồi chốt lại.
    setEdits((d) => ({ ...d, [room.id]: Object.fromEntries(FIELDS.map(([f]) => [f, String(reading[f])])) }))
    toast.success(`Đã hủy ${invoiceCount} hóa đơn phòng ${room.code}. Sửa chỉ số rồi chốt lại.`)
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Không có phòng nào cần chốt"
        description={`Tháng ${period} tòa ${building.name} chưa có sinh viên ở.`}
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
                {FIELDS.map(([f, label]) => (
                  <TableHead key={f}>{label}</TableHead>
                ))}
                <TableHead className="text-right">Mỗi SV trả</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ room, value, invalid, reading }) => (
                <TableRow key={room.id}>
                  <TableCell className="font-medium">
                    {room.code} <span className="text-muted-foreground text-xs">· tầng {room.floor}</span>
                  </TableCell>
                  <TableCell className="text-right">{room.residents}</TableCell>
                  {room.billed ? (
                    <TableCell colSpan={5}>
                      <div className="flex items-center justify-end gap-3">
                        <StatusBadge label="Đã lập hóa đơn" tone="success" />
                        {room.cancelBlock ? (
                          <span className="text-muted-foreground text-xs">{CANCEL_BLOCK_TEXT[room.cancelBlock]}</span>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => setCancelling(room)}>
                            Hủy chốt
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  ) : (
                    <>
                      {FIELDS.map(([f, label]) => (
                        <TableCell key={f}>
                          <Input
                            type="number"
                            min={0}
                            value={value(f)}
                            onChange={(e) =>
                              setEdits((d) => ({ ...d, [room.id]: { ...d[room.id], [f]: e.target.value } }))
                            }
                            aria-label={`${label} phòng ${room.code}`}
                            aria-invalid={invalid}
                            className="h-8 w-24"
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        {invalid ? (
                          <span className="text-destructive text-xs">Chỉ số mới nhỏ hơn cũ hoặc không hợp lệ</span>
                        ) : reading ? (
                          formatMoney(share(reading, room.residents))
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Đơn giá {formatMoney(prices.electric)}/kWh · {formatMoney(prices.water)}/m³.
          {emptyRooms.length > 0 && ` Phòng trống, không lập hóa đơn: ${emptyRooms.join(', ')}.`}
        </p>
        <Button onClick={submit} disabled={bill.isPending || rows.some((r) => r.invalid) || ready.length === 0}>
          {bill.isPending ? 'Đang lập hóa đơn…' : `Chốt ${ready.length} phòng và lập hóa đơn`}
        </Button>
      </div>

      <ConfirmDialog
        target={cancelling}
        onClose={() => setCancelling(null)}
        title="Hủy chốt điện nước?"
        description={(room) => (
          <>
            Xóa hóa đơn điện nước tháng <strong>{period}</strong> của mọi sinh viên phòng <strong>{room.code}</strong>.
            Chỉ số đã nhập được điền lại vào bảng để bạn sửa rồi chốt lại.
          </>
        )}
        confirmLabel="Hủy chốt"
        cancelLabel="Giữ lại"
        isPending={cancel.isPending}
        onConfirm={confirmCancel}
      />
    </>
  )
}
