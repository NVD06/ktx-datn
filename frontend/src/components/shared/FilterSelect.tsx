import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Radix Select không cho item có value rỗng, nên "tất cả" dùng một giá trị giả.
const ALL = '__all__'

export interface FilterOption {
  value: string
  label: string
}

/** Bộ lọc dạng dropdown. `value = ''` nghĩa là không lọc. */
export function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
}: {
  value: string
  onChange: (value: string) => void
  options: FilterOption[]
  allLabel: string
}) {
  return (
    <Select value={value || ALL} onValueChange={(next) => onChange(next === ALL ? '' : next)}>
      <SelectTrigger className="bg-card min-w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
