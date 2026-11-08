import { Bar, BarChart, Cell, LabelList, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { HYGIENE_WARNING_SCORE } from '@/lib/labels'

const CONFIG = { score: { label: 'Điểm', color: 'var(--chart-2)' } } satisfies ChartConfig

export interface HygienePeriodScore {
  tick: string
  score: number | null
  current: boolean
}

export function HygienePeriodChart({ data }: { data: HygienePeriodScore[] }) {
  return (
    <ChartContainer config={CONFIG} className="aspect-auto h-56 w-full">
      <BarChart data={data} margin={{ top: 24 }} accessibilityLayer>
        <XAxis dataKey="tick" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis hide domain={[0, 100]} />
        <ReferenceLine y={HYGIENE_WARNING_SCORE} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
        <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={48}>
          <LabelList dataKey="score" position="top" offset={8} className="fill-foreground text-xs font-semibold" />
          {data.map((m) => (
            <Cell
              key={m.tick}
              fill={m.score !== null && m.score < HYGIENE_WARNING_SCORE ? 'var(--tone-danger-fg)' : 'var(--color-score)'}
              fillOpacity={m.current ? 0.45 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
