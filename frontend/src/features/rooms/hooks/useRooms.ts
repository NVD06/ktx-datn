import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listBuildingRooms } from '@/api/buildings'
import * as roomsApi from '@/api/rooms'
import type { ListParams } from '@/types/api'
import type { BedUpdateInput, RoomInput } from '@/types/facility'

export const roomKeys = {
  all: ['rooms'] as const,
  byBuilding: (buildingId: string, params: ListParams) =>
    ['rooms', 'building', buildingId, params] as const,
  detail: (id: string) => ['rooms', 'detail', id] as const,
  availableSummary: ['rooms', 'available', 'summary'] as const,
}

export function useBuildingRooms(buildingId: string, params: ListParams) {
  return useQuery({
    queryKey: roomKeys.byBuilding(buildingId, params),
    queryFn: () => listBuildingRooms(buildingId, params),
    placeholderData: keepPreviousData,
  })
}

export function useRoom(id: string) {
  return useQuery({
    queryKey: roomKeys.detail(id),
    queryFn: () => roomsApi.getRoom(id),
    enabled: !!id,
  })
}

/** Chỗ trống theo tòa × loại phòng mà sinh viên đang đăng nhập được ở. */
export function useAvailableSummary() {
  return useQuery({
    queryKey: roomKeys.availableSummary,
    queryFn: roomsApi.getAvailableSummary,
  })
}

/** Phòng thay đổi thì số phòng của tòa cũng đổi. */
function useInvalidateRooms() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: roomKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['buildings'] }),
      queryClient.invalidateQueries({ queryKey: ['room-types'] }),
    ])
}

export function useSaveRoom() {
  const invalidate = useInvalidateRooms()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: RoomInput }) => {
      if (!id) return roomsApi.createRoom(input)
      const { buildingId: _buildingId, ...changes } = input // không đổi được tòa của phòng
      return roomsApi.updateRoom(id, changes)
    },
    onSuccess: invalidate,
  })
}

export function useDeleteRoom() {
  const invalidate = useInvalidateRooms()
  return useMutation({ mutationFn: roomsApi.deleteRoom, onSuccess: invalidate })
}

// ── Giường — trạng thái giường quyết định trạng thái phòng nên làm mới cả nhóm 'rooms'.

export function useCreateBed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: roomsApi.createBed,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomKeys.all }),
  })
}

export function useUpdateBed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BedUpdateInput }) =>
      roomsApi.updateBed(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomKeys.all }),
  })
}

export function useDeleteBed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: roomsApi.deleteBed,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomKeys.all }),
  })
}
