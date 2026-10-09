import { Bar, BarChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { REQUEST_STATUS } from '@/lib/labels'
import type { RequestStatus } from '@/types/maintenance'

const CONFIG = { count: { label: 'Số yêu cầu', color: 'var(--chart-2)' } } satisfies ChartConfig

/** Số yêu cầu sửa chữa theo trạng thái — thanh ngang, theo thứ tự của luồng xử lý. */
export function RequestStatusChart({ counts }: { counts: Record<RequestStatus, number> }) {
  const rows = (Object.keys(REQUEST_STATUS) as RequestStatus[]).map((status) => ({
    status: REQUEST_STATUS[status].label,
    count: counts[status],
  }))

  return (
    <ChartContainer config={CONFIG} className="aspect-auto h-52 w-full">
      <BarChart data={rows} layout="vertical" accessibilityLayer>
        <XAxis type="number" dataKey="count" hide allowDecimals={false} />
        <YAxis type="category" dataKey="status" tickLine={false} axisLine={false} width={104} interval={0} />
        {/* Số đứng thành cột bên phải: thanh bằng 0 không được vẽ nên nhãn gắn ở đầu thanh sẽ mất. */}
        <YAxis
          yAxisId="count"
          type="category"
          dataKey="count"
          orientation="right"
          tickLine={false}
          axisLine={false}
          width={32}
          interval={0}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={4} maxBarSize={20} />
      </BarChart>
    </ChartContainer>
  )
}
