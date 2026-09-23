import { orDash } from '@/lib/format'

/** [nhãn, giá trị, chiếm cả hàng?] */
export type DetailRow = [label: string, value: string | null | undefined, wide?: boolean]

/**
 * Danh sách "nhãn — giá trị": hai cột trên màn rộng, một cột trên điện thoại.
 * `hideEmpty` bỏ dòng không có giá trị (ghi chú, phản hồi); không thì hiện `—`
 * để người xem thấy còn thiếu gì.
 */
export function DetailList({ rows, hideEmpty = false }: { rows: DetailRow[]; hideEmpty?: boolean }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {rows.map(([label, value, wide]) =>
        hideEmpty && !value ? null : (
          <div key={label} className={wide ? 'sm:col-span-2' : undefined}>
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="whitespace-pre-line">{orDash(value)}</dd>
          </div>
        ),
      )}
    </dl>
  )
}
