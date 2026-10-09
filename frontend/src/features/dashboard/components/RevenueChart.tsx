import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatMoney, formatMoneyCompact, formatMonth } from '@/lib/format'
import { INVOICE_TYPE } from '@/lib/labels'
import type { RevenueMonth } from '@/types/report'

const CONFIG = {
  roomFee: { label: INVOICE_TYPE.ROOM_FEE.label, color: 'var(--chart-2)' },
  utility: { label: INVOICE_TYPE.UTILITY.label, color: 'var(--chart-1)' },
} satisfies ChartConfig

/** Doanh thu theo tháng — cột chồng tiền phòng + điện nước. */
export function RevenueChart({ data }: { data: RevenueMonth[] }) {
  const rows = data.map((m) => ({ month: formatMonth(m.month), roomFee: Number(m.roomFee), utility: Number(m.utility) }))

  return (
    <ChartContainer config={CONFIG} className="aspect-auto h-64 w-full">
      <BarChart data={rows} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={48} tickCount={4} tickFormatter={formatMoneyCompact} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <>
                  <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: `var(--color-${name})` }} />
                  <span className="text-muted-foreground">{CONFIG[name as keyof typeof CONFIG].label}</span>
                  <span className="ml-auto font-medium">{formatMoney(Number(value))}</span>
                </>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="roomFee" stackId="revenue" fill="var(--color-roomFee)" maxBarSize={24} />
        <Bar dataKey="utility" stackId="revenue" fill="var(--color-utility)" maxBarSize={24} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
