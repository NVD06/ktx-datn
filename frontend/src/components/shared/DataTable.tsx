import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type SortingState,
  type Updater,
} from '@tanstack/react-table'
import type { UseQueryResult } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Pagination } from '@/components/shared/Pagination'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/QueryState'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { useListParams } from '@/hooks/useListParams'
import { cn } from '@/lib/utils'
import type { Paged } from '@/types/api'

/** Gắn vào `meta` của cột, ví dụ cột số: `meta: { className: 'text-right' }`. */
export interface ColumnClassMeta {
  className?: string
}

interface DataTableProps<TData extends { id: string }, TValue> {
  /** Cột nào sắp xếp được ở server thì khai báo `enableSorting: true`, id cột = tên field của backend. */
  columns: ColumnDef<TData, TValue>[]
  /** Kết quả useQuery của API danh sách (getPaged). */
  query: Pick<UseQueryResult<Paged<TData>>, 'data' | 'isPending' | 'isFetching' | 'error'>
  /** Trang/sắp xếp đang lưu trên URL — kết quả của useListParams. */
  list: Pick<ReturnType<typeof useListParams>, 'sortBy' | 'order' | 'setSort' | 'setPage'>
  /** Ô tìm kiếm, bộ lọc — đặt phía trên bảng. */
  toolbar?: ReactNode
  emptyTitle?: string
  emptyDescription?: string
}

function columnClass<TData>(column: Column<TData, unknown>) {
  return (column.columnDef.meta as ColumnClassMeta | undefined)?.className
}

/**
 * Bảng dữ liệu dùng chung cho mọi màn hình quản trị (docs/convention.md §8).
 *
 * Phân trang và sắp xếp đều làm ở server: bảng chỉ hiển thị đúng trang backend
 * trả về, còn trạng thái trang/sắp xếp nằm trên URL (xem useListParams).
 */
export function DataTable<TData extends { id: string }, TValue>({
  columns,
  query,
  list,
  toolbar,
  emptyTitle,
  emptyDescription,
}: DataTableProps<TData, TValue>) {
  const { data, isPending: isLoading, isFetching, error } = query
  const { sortBy, order } = list
  const meta = data?.meta
  const rows = useMemo(() => data?.data ?? [], [data])
  const sorting: SortingState = sortBy ? [{ id: sortBy, desc: order === 'desc' }] : []

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualSorting: true,
    manualPagination: true,
    defaultColumn: { enableSorting: false, sortDescFirst: false },
    state: { sorting },
    onSortingChange: (updater: Updater<SortingState>) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      const first = next[0]
      list.setSort(first?.id, first ? (first.desc ? 'desc' : 'asc') : undefined)
    },
  })

  const stateRow = (content: ReactNode) => (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columns.length} className="p-4 whitespace-normal">
        {content}
      </TableCell>
    </TableRow>
  )

  let body: ReactNode
  if (error) body = stateRow(<ErrorState error={error} />)
  else if (isLoading) body = stateRow(<LoadingState />)
  else if (rows.length === 0) {
    body = stateRow(<EmptyState title={emptyTitle} description={emptyDescription} />)
  } else {
    body = table.getRowModel().rows.map((row) => (
      <TableRow key={row.id}>
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id} className={cn('px-3 py-2.5', columnClass(cell.column))}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    ))
  }

  return (
    <div className="space-y-3">
      {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}

      <div className="bg-card ring-foreground/10 overflow-hidden rounded-xl ring-1">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="hover:bg-transparent">
                {group.headers.map((header) => {
                  const content = header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())
                  const sorted = header.column.getIsSorted()

                  return (
                    <TableHead
                      key={header.id}
                      className={cn('text-muted-foreground px-3', columnClass(header.column))}
                    >
                      {header.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="hover:text-foreground inline-flex items-center gap-1"
                        >
                          {content}
                          {sorted === 'asc' ? (
                            <ArrowUp className="size-3.5" />
                          ) : sorted === 'desc' ? (
                            <ArrowDown className="size-3.5" />
                          ) : (
                            <ArrowUpDown className="size-3.5 opacity-50" />
                          )}
                        </button>
                      ) : (
                        content
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className={cn(isFetching && !isLoading && 'opacity-60 transition-opacity')}>
            {body}
          </TableBody>
        </Table>
      </div>

      {meta && !error && <Pagination meta={meta} onPageChange={list.setPage} />}
    </div>
  )
}
