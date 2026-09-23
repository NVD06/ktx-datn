import { useMutation, useQuery } from '@tanstack/react-query'
import * as usersApi from '@/api/users'
import { useInvalidate } from '@/hooks/useInvalidate'

const MANAGER_PARAMS = { role: 'MANAGER', limit: 100, sortBy: 'fullName', order: 'asc' }

/** Toàn bộ tài khoản quản lý — dùng cho dialog gán quản lý vào tòa. */
export function useManagers() {
  return useQuery({
    queryKey: ['users', 'list', MANAGER_PARAMS],
    queryFn: () => usersApi.listUsers(MANAGER_PARAMS),
  })
}

export function useAssignManager() {
  // Tòa nhà hiển thị danh sách quản lý của mình.
  const invalidate = useInvalidate(['users'], ['buildings'])
  return useMutation({
    mutationFn: ({ userId, buildingId }: { userId: string; buildingId: string | null }) =>
      usersApi.updateUser(userId, { buildingId }),
    onSuccess: invalidate,
  })
}
