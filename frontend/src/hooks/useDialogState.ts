import { useState } from 'react'

/**
 * Drawer / form mở cho một bản ghi: `show(item)` mở, `setOpen(false)` đóng. `item`
 * không bị xóa khi đóng, để nội dung còn nguyên trong lúc hộp thoại trượt ra.
 * Form thêm mới dùng `show(null)`.
 */
export function useDialogState<T>() {
  const [item, setItem] = useState<T | null>(null)
  const [open, setOpen] = useState(false)

  function show(next: T | null) {
    setItem(next)
    setOpen(true)
  }

  return { item, open, setOpen, show }
}
