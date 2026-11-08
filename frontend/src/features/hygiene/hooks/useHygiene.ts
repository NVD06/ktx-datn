import { keepPreviousData, skipToken, useMutation, useQuery } from '@tanstack/react-query'
import * as hygieneApi from '@/api/hygiene'
import { useInvalidate } from '@/hooks/useInvalidate'
import type { ListParams } from '@/types/api'

export const hygieneKeys = {
  all: ['hygiene'] as const,
  list: (params: ListParams) => ['hygiene', 'list', params] as const,
  mine: ['hygiene', 'mine'] as const,
  marks: ['hygiene', 'marks'] as const,
  sheet: (buildingId: string, checkDate: string) => ['hygiene', 'sheet', buildingId, checkDate] as const,
}

export function useHygieneRecords(params: ListParams) {
  return useQuery({
    queryKey: hygieneKeys.list(params),
    queryFn: () => hygieneApi.listHygieneRecords(params),
    placeholderData: keepPreviousData,
  })
}

export function useMyHygieneRecords() {
  return useQuery({ queryKey: hygieneKeys.mine, queryFn: hygieneApi.listMyHygieneRecords })
}

export function useMyHygieneMarks() {
  return useQuery({ queryKey: hygieneKeys.marks, queryFn: hygieneApi.getMyHygieneMarks })
}

export function useHygieneSheet(buildingId: string | null, checkDate: string) {
  return useQuery({
    queryKey: hygieneKeys.sheet(buildingId ?? '', checkDate),
    queryFn: buildingId ? () => hygieneApi.getHygieneSheet(buildingId, checkDate) : skipToken,
  })
}

/**
 * Lưu xong: bảng chấm và bảng điểm đều nằm dưới hygieneKeys.all. Làm mới cả khi LỖI: 409
 * nghĩa là người khác vừa chấm phòng này, tải lại bảng chấm để thấy điểm thật.
 */
export function useSaveHygiene() {
  const invalidate = useInvalidate(hygieneKeys.all)
  return useMutation({ mutationFn: hygieneApi.saveHygiene, onSettled: invalidate })
}

export function useDeleteHygieneRecord() {
  const invalidate = useInvalidate(hygieneKeys.all)
  return useMutation({ mutationFn: hygieneApi.deleteHygieneRecord, onSuccess: invalidate })
}
