import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as profileApi from '@/api/profile'

export const profileKeys = {
  me: ['profile', 'me'] as const,
}

export function useProfile() {
  return useQuery({ queryKey: profileKeys.me, queryFn: profileApi.getProfile })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: profileApi.updateProfile,
    // Ghi thẳng kết quả vào cache — trang đăng ký đọc `isComplete` từ đây.
    onSuccess: (profile) => queryClient.setQueryData(profileKeys.me, profile),
  })
}
