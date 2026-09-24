import {
  keepPreviousData,
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { listBuildingRooms } from '@/api/buildings'
import * as roomsApi from '@/api/rooms'
import { useInvalidate } from '@/hooks/useInvalidate'
import type { ListParams } from '@/types/api'
import type { AvailableBedParams, BedUpdateInput, RoomInput } from '@/types/facility'

export const roomKeys = {
  all: ['rooms'] as const,
  byBuilding: (buildingId: string, params: ListParams) =>
    ['rooms', 'building', buildingId, params] as const,
  detail: (id: string) => ['rooms', 'detail', id] as const,
  availableSummary: ['rooms', 'available', 'summary'] as const,
  availableBeds: (params: AvailableBedParams | null) => ['rooms', 'available', 'beds', params] as const,
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

/**
 * Giường còn xếp được cho một sinh viên — dialog duyệt đơn. `null` = chưa biết
 * giới tính SV, không gọi. Luôn tải lại khi mở dialog: danh sách cũ vài phút
 * trước có thể đã có giường vừa được người khác xếp.
 */
export function useAvailableBeds(params: AvailableBedParams | null) {
  return useQuery({
    queryKey: roomKeys.availableBeds(params),
    queryFn: params ? () => roomsApi.listAvailableBeds(params) : skipToken,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

/** Phòng thay đổi thì số phòng của tòa và của loại phòng cũng đổi. */
function useInvalidateRooms() {
  return useInvalidate(roomKeys.all, ['buildings'], ['room-types'])
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
  const queryClient = useQueryClient()
  const invalidateCounts = useInvalidate(['buildings'], ['room-types'])
  return useMutation({
    mutationFn: roomsApi.deleteRoom,
    onSuccess: (_data, id) =>
      Promise.all([
        invalidateCounts(),
        // Trang chi tiết của chính phòng vừa xóa có thể còn đang mở: tải lại sẽ nhận
        // 404 và nháy lỗi trước khi kịp chuyển trang — chỉ đánh dấu cũ, không tải lại.
        queryClient.invalidateQueries({
          queryKey: roomKeys.all,
          predicate: (q) => q.queryKey[1] !== 'detail' || q.queryKey[2] !== id,
        }),
        queryClient.invalidateQueries({ queryKey: roomKeys.detail(id), refetchType: 'none' }),
      ]),
  })
}

// ── Giường — trạng thái giường quyết định trạng thái phòng nên làm mới cả nhóm 'rooms'.

export function useCreateBed() {
  const invalidate = useInvalidate(roomKeys.all)
  return useMutation({ mutationFn: roomsApi.createBed, onSuccess: invalidate })
}

export function useUpdateBed() {
  const invalidate = useInvalidate(roomKeys.all)
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BedUpdateInput }) =>
      roomsApi.updateBed(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteBed() {
  const invalidate = useInvalidate(roomKeys.all)
  return useMutation({ mutationFn: roomsApi.deleteBed, onSuccess: invalidate })
}
