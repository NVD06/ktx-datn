import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import * as usersApi from '@/api/users'
import { useInvalidate } from '@/hooks/useInvalidate'
import type { ListParams } from '@/types/api'

const MANAGER_PARAMS = { role: 'MANAGER', limit: 100, sortBy: 'fullName', order: 'asc' }

/** Bảng người dùng của Admin (US-01.6). */
export function useUsers(params: ListParams) {
  return useQuery({
    queryKey: ['users', 'list', params],
    queryFn: () => usersApi.listUsers(params),
    placeholderData: keepPreviousData,
  })
}

/** Toàn bộ tài khoản quản lý — dùng cho dialog gán quản lý vào tòa. */
export function useManagers() {
  return useQuery({
    queryKey: ['users', 'list', MANAGER_PARAMS],
    queryFn: () => usersApi.listUsers(MANAGER_PARAMS),
  })
}

/** Tòa nhà hiển thị quản lý của mình, nên đổi người dùng thì làm mới cả tòa. */
function useInvalidateUsers() {
  return useInvalidate(['users'], ['buildings'])
}

export function useCreateManager() {
  const invalidate = useInvalidateUsers()
  return useMutation({ mutationFn: usersApi.createManager, onSuccess: invalidate })
}

export function useAssignManager() {
  const invalidate = useInvalidateUsers()
  return useMutation({
    mutationFn: ({ userId, buildingId }: { userId: string; buildingId: string | null }) =>
      usersApi.updateUser(userId, { buildingId }),
    onSuccess: invalidate,
  })
}

export function useSetUserActive() {
  const invalidate = useInvalidateUsers()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => usersApi.updateUser(id, { isActive }),
    onSuccess: invalidate,
  })
}
