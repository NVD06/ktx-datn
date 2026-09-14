import { useSearchParams } from 'react-router-dom'
import type { ListParams, SortOrder } from '@/types/api'

type ParamValue = string | number | undefined | null

/**
 * Phân trang / sắp xếp / tìm kiếm / lọc của một bảng, lưu trên URL.
 *
 * Lưu trên URL thay vì useState: tải lại trang hay bấm quay lại vẫn giữ nguyên
 * bộ lọc, gửi link cho người khác thì họ thấy đúng bảng đó. `params` đưa thẳng
 * vào queryKey và API (docs/convention.md §7).
 *
 *   const list = useListParams(['status', 'floor'] as const)
 *   const query = useRooms(list.params)
 */
export function useListParams<F extends string = never>(filterKeys: readonly F[] = []) {
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const sortBy = searchParams.get('sortBy') ?? undefined
  const rawOrder = searchParams.get('order')
  const order: SortOrder | undefined =
    rawOrder === 'asc' || rawOrder === 'desc' ? rawOrder : undefined
  const search = searchParams.get('search') ?? ''
  const filters = Object.fromEntries(
    filterKeys.map((key) => [key, searchParams.get(key) ?? '']),
  ) as Record<F, string>

  /** Mọi thay đổi trừ chuyển trang đều quay về trang 1 — trang cũ có thể không còn tồn tại. */
  function update(changes: Record<string, ParamValue>) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(changes)) {
          if (value === undefined || value === null || value === '') next.delete(key)
          else next.set(key, String(value))
        }
        if (!('page' in changes)) next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  const params: ListParams = { page, sortBy, order, search: search || undefined, ...filters }

  return {
    params,
    page,
    sortBy,
    order,
    search,
    filters,
    setPage: (value: number) => update({ page: value === 1 ? undefined : value }),
    setSearch: (value: string) => update({ search: value }),
    setFilter: (key: F, value: string) => update({ [key]: value }),
    setSort: (field: string | undefined, direction: SortOrder | undefined) =>
      update({ sortBy: field, order: direction }),
  }
}
