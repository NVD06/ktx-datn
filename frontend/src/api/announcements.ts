import { api, apiGet, apiPatch, apiPost, getPaged } from './client'
import type { ListParams } from '@/types/api'
import type { Announcement, AnnouncementInput, MyAnnouncement } from '@/types/announcement'

export function listAnnouncements(params: ListParams) {
  return getPaged<Announcement>('/announcements', params)
}

export function listMyAnnouncements() {
  return apiGet<MyAnnouncement[]>('/announcements/me')
}

export function createAnnouncement(input: AnnouncementInput) {
  return apiPost<Announcement>('/announcements', input)
}

export function updateAnnouncement(id: string, input: AnnouncementInput) {
  return apiPatch<Announcement>(`/announcements/${id}`, input)
}

export async function deleteAnnouncement(id: string) {
  await api.delete(`/announcements/${id}`)
}

export function markAnnouncementRead(id: string) {
  return apiPost<{ id: string }>(`/announcements/${id}/read`)
}
