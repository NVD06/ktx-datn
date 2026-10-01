import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PAGE_SIZES } from '@/hooks/useListParams'

/** Số dòng mỗi trang (5/10/20) — DataTable đặt ngay sau các bộ lọc, cùng kiểu với FilterSelect. */
export function PageSizeSelect({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <Select value={String(value)} onValueChange={(next) => onChange(Number(next))}>
      <SelectTrigger className="bg-card min-w-36" aria-label="Số dòng mỗi trang">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        {PAGE_SIZES.map((size) => (
          <SelectItem key={size} value={String(size)}>
            {size} dòng / trang
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
