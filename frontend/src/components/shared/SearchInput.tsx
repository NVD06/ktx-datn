import { Search } from 'lucide-react'
import { useEffect, useEffectEvent, useState } from 'react'
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
  const [lastValue, setLastValue] = useState(value)

  // `value` đổi từ bên ngoài (bấm menu để xóa lọc, quay lại trang…) thì ô nhập
  // theo URL — nếu không, lần debounce kế tiếp ghi chữ cũ trở lại URL. Bỏ qua khi
  // `value` chỉ là bản đã trim của chữ đang gõ, để không nuốt dấu cách giữa hai từ.
  if (value !== lastValue) {
    setLastValue(value)
    if (value !== text.trim()) setText(value)
  }

  // `onChange` của cha là hàm mới sau mỗi lần render; đưa vào deps thì timer bị đặt lại liên tục.
  const emit = useEffectEvent((next: string) => onChange(next))

  useEffect(() => {
    // So với bản đã trim: "abc " và URL "abc" là như nhau, không gọi lại (gọi lại
    // sẽ xóa `page` trên URL, bấm sang trang 2 bị đá về trang 1).
    const next = text.trim()
    if (next === value) return
    const timer = setTimeout(() => emit(next), 300)
    return () => clearTimeout(timer)
  }, [text, value])

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
