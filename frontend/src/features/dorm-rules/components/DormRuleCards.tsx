import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { SelectableRow } from '@/components/shared/SelectableRow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DormRule } from '@/types/dorm-rule'

export function DormRuleTitles({
  rules,
  selectedId,
  onSelect,
}: {
  rules: DormRule[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nội quy ký túc xá</CardTitle>
        <p className="text-muted-foreground text-xs">Bấm vào từng mục để xem quy định.</p>
      </CardHeader>
      <CardContent className="space-y-1 px-2">
        {rules.length === 0 && <p className="text-muted-foreground px-3 text-sm">Chưa có nội quy nào.</p>}
        {rules.map((r, i) => (
          <SelectableRow
            key={r.id}
            active={r.id === selectedId}
            onClick={() => onSelect(r.id)}
            className="items-center text-sm font-medium"
          >
            <span className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">{r.title}</span>
            <ChevronRight className="text-muted-foreground size-4 shrink-0" />
          </SelectableRow>
        ))}
      </CardContent>
    </Card>
  )
}

export function DormRuleDetail({ rule, actions }: { rule: DormRule; actions: ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <CardTitle className="text-base">{rule.title}</CardTitle>
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2.5">
          {rule.content
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="text-muted-foreground w-4 shrink-0 text-right tabular-nums">{i + 1}.</span>
                <span>{line}</span>
              </li>
            ))}
        </ol>
      </CardContent>
    </Card>
  )
}
