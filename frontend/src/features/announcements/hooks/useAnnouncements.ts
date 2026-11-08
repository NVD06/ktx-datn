import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import * as announcementsApi from '@/api/announcements'
import { useInvalidate } from '@/hooks/useInvalidate'
import type { ListParams } from '@/types/api'
import type { AnnouncementInput } from '@/types/announcement'

export const announcementKeys = {
  all: ['announcements'] as const,
  list: (params: ListParams) => ['announcements', 'list', params] as const,
  mine: ['announcements', 'mine'] as const,
}

export function useAnnouncements(params: ListParams) {
  return useQuery({
    queryKey: announcementKeys.list(params),
    queryFn: () => announcementsApi.listAnnouncements(params),
    placeholderData: keepPreviousData,
  })
}

export function useMyAnnouncements(enabled = true) {
  return useQuery({ queryKey: announcementKeys.mine, queryFn: announcementsApi.listMyAnnouncements, enabled })
}

export function useSaveAnnouncement() {
  const invalidate = useInvalidate(announcementKeys.all)
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: AnnouncementInput }) =>
      id ? announcementsApi.updateAnnouncement(id, input) : announcementsApi.createAnnouncement(input),
    onSuccess: invalidate,
  })
}

export function useDeleteAnnouncement() {
  const invalidate = useInvalidate(announcementKeys.all)
  return useMutation({ mutationFn: announcementsApi.deleteAnnouncement, onSuccess: invalidate })
}

export function useMarkAnnouncementRead() {
  const invalidate = useInvalidate(announcementKeys.mine)
  return useMutation({ mutationFn: announcementsApi.markAnnouncementRead, onSuccess: invalidate })
}
