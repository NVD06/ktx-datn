import { useState } from 'react'

/**
 * Drawer chi tiết của một trang danh sách. `item` không bị xóa khi đóng, để nội
 * dung còn nguyên trong lúc drawer trượt ra.
 */
export function useDetailSheet<T>() {
  const [item, setItem] = useState<T | null>(null)
  const [open, setOpen] = useState(false)

  function show(next: T) {
    setItem(next)
    setOpen(true)
  }

  return { item, open, setOpen, show }
}
