import { Bar, BarChart, Cell, LabelList, XAxis } from 'recharts'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { formatMoney, formatMonth } from '@/lib/format'
import { INVOICE_TYPE } from '@/lib/labels'
import type { RevenueMonth } from '@/types/report'

const CONFIG = { total: { label: 'Đã thu', color: 'var(--chart-2)' } } satisfies ChartConfig

const millions = (value: number) => (value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })

/** Doanh thu đã thu theo tháng (triệu đồng) — tháng này còn dở nên tô nhạt; di chuột để xem tiền phòng / điện nước. */
export function RevenueChart({ data }: { data: RevenueMonth[] }) {
  const rows = data.map((m, i) => ({
    month: m.month,
    tick: `T${Number(m.month.slice(5))}`,
    roomFee: Number(m.roomFee),
    utility: Number(m.utility),
    total: Number(m.roomFee) + Number(m.utility),
    current: i === data.length - 1,
  }))

  return (
    <ChartContainer config={CONFIG} className="aspect-auto h-64 w-full">
      <BarChart data={rows} margin={{ top: 24 }} accessibilityLayer>
        <XAxis dataKey="tick" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip
          cursor={false}
          content={({ active, payload }) => {
            const row = active ? (payload?.[0]?.payload as (typeof rows)[number] | undefined) : undefined
            if (!row) return null
            return (
              <div className="bg-background grid gap-1 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                <p className="font-medium">Tháng {formatMonth(row.month)}</p>
                <p className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{INVOICE_TYPE.ROOM_FEE.label}</span>
                  {formatMoney(row.roomFee)}
                </p>
                <p className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{INVOICE_TYPE.UTILITY.label}</span>
                  {formatMoney(row.utility)}
                </p>
                <p className="flex justify-between gap-4 font-medium">
                  <span>Tổng</span>
                  {formatMoney(row.total)}
                </p>
              </div>
            )
          }}
        />
        <Bar dataKey="total" fill="var(--color-total)" radius={[6, 6, 0, 0]} maxBarSize={56}>
          <LabelList
            dataKey="total"
            position="top"
            offset={8}
            className="fill-foreground text-xs font-semibold"
            formatter={(value) => millions(Number(value))}
          />
          {rows.map((r) => (
            <Cell key={r.month} fillOpacity={r.current ? 0.35 : 1} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
