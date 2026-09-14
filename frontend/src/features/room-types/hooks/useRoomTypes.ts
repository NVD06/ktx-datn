import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as roomTypesApi from '@/api/room-types'
import type { ListParams } from '@/types/api'
import type { RoomTypeInput } from '@/types/facility'

export const roomTypeKeys = {
  all: ['room-types'] as const,
  list: (params: ListParams) => ['room-types', 'list', params] as const,
}

export function useRoomTypes(params: ListParams) {
  return useQuery({
    queryKey: roomTypeKeys.list(params),
    queryFn: () => roomTypesApi.listRoomTypes(params),
    placeholderData: keepPreviousData,
  })
}

/** Toàn bộ loại phòng cho dropdown chọn loại phòng và bộ lọc. */
export function useRoomTypeOptions() {
  return useRoomTypes({ limit: 100, sortBy: 'name', order: 'asc' })
}

export function useSaveRoomType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: RoomTypeInput }) =>
      id ? roomTypesApi.updateRoomType(id, input) : roomTypesApi.createRoomType(input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: roomTypeKeys.all }),
        // Bảng phòng hiển thị tên + giá của loại phòng.
        queryClient.invalidateQueries({ queryKey: ['rooms'] }),
      ]),
  })
}

export function useDeleteRoomType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: roomTypesApi.deleteRoomType,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomTypeKeys.all }),
  })
}
