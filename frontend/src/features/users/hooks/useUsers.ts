import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import * as usersApi from '@/api/users'
import { useInvalidate } from '@/hooks/useInvalidate'
import type { ListParams } from '@/types/api'
import type { StudentAccountInput } from '@/types/user'

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

export function useCreateStudent() {
  const invalidate = useInvalidateUsers()
  return useMutation({ mutationFn: usersApi.createStudent, onSuccess: invalidate })
}

/** Kiểm tra (`dryRun`) và nhập thật dùng chung một hook; chỉ nhập thật mới cần làm mới bảng. */
export function useImportStudents() {
  const invalidate = useInvalidateUsers()
  return useMutation({
    mutationFn: ({ rows, dryRun }: { rows: StudentAccountInput[]; dryRun: boolean }) =>
      usersApi.importStudents(rows, dryRun),
    onSuccess(result) {
      if (!result.dryRun) return invalidate()
    },
  })
}

export function useResetStudentPassword() {
  const invalidate = useInvalidateUsers()
  return useMutation({ mutationFn: usersApi.resetStudentPassword, onSuccess: invalidate })
}

export function useDeleteUser() {
  const invalidate = useInvalidateUsers()
  return useMutation({ mutationFn: usersApi.deleteUser, onSuccess: invalidate })
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
