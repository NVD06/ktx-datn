import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'

/** Ô tìm kiếm có debounce: ngừng gõ 300ms mới gọi `onChange`, không gọi API theo từng phím. */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Tìm kiếm…',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const [text, setText] = useState(value)

  useEffect(() => {
    if (text === value) return
    const timer = setTimeout(() => onChange(text.trim()), 300)
    return () => clearTimeout(timer)
  }, [text, value, onChange])

  return (
    <div className="relative w-64">
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="bg-card pl-8"
      />
    </div>
  )
}
