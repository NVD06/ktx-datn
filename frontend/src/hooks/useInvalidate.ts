import { useQueryClient, type QueryKey } from '@tanstack/react-query'

/**
 * Hàm làm mới các nhóm query sau một mutation (docs/convention.md §7):
 *
 *   const invalidate = useInvalidate(roomKeys.all, ['buildings'])
 *   return useMutation({ mutationFn: roomsApi.deleteRoom, onSuccess: invalidate })
 */
export function useInvalidate(...keys: QueryKey[]) {
  const queryClient = useQueryClient()
  return () => Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}
