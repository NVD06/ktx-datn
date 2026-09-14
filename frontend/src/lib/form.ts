import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { getErrorMessage, getFieldErrors } from '@/api/client'

/**
 * Hiện lỗi của một lần submit form.
 *
 * Lỗi validate theo field (400 kèm `details`) được gắn thẳng dưới ô nhập tương
 * ứng. Lỗi không thuộc field nào — 409 trùng mã, 403 hết quyền… — hiện bằng toast.
 */
export function showFormError<T extends FieldValues>(form: UseFormReturn<T>, error: unknown) {
  const details = getFieldErrors(error)
  let applied = false

  for (const field of Object.keys(form.getValues())) {
    const message = details?.[field]?.[0]
    if (message) {
      form.setError(field as Path<T>, { message })
      applied = true
    }
  }

  if (!applied) toast.error(getErrorMessage(error))
}
