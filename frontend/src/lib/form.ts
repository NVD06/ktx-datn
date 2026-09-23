import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { getErrorMessage, getFieldErrors } from '@/api/client'

/**
 * Gắn lỗi validate theo field (400 kèm `details`) thẳng dưới ô nhập tương ứng.
 *
 * Trả về thông báo cho phần không gắn được vào ô nào — 409 trùng mã, 403 hết
 * quyền…, hoặc lỗi của trường không có trên form (ví dụ nguyện vọng tòa ở form
 * nộp đơn, form chỉ có ô ghi chú). Trả `null` khi mọi lỗi đã nằm dưới ô nhập.
 */
export function applyFormError<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: unknown,
): string | null {
  const details = getFieldErrors(error) ?? {}
  const fields = new Set(Object.keys(form.getValues()))
  const rest: string[] = []
  let applied = false

  for (const [field, messages] of Object.entries(details)) {
    const message = messages[0]
    if (!message) continue
    if (fields.has(field)) {
      form.setError(field as Path<T>, { message })
      applied = true
    } else {
      // Không có ô để gắn: hiện đúng câu của trường đó, không phải "Dữ liệu không hợp lệ".
      rest.push(message)
    }
  }

  if (rest.length > 0) return rest.join(' ')
  return applied ? null : getErrorMessage(error)
}

/** Hiện lỗi của một lần submit form: lỗi theo field dưới ô nhập, phần còn lại bằng toast. */
export function showFormError<T extends FieldValues>(form: UseFormReturn<T>, error: unknown) {
  const message = applyFormError(form, error)
  if (message) toast.error(message)
}
