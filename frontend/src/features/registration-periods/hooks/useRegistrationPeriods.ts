import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import * as periodsApi from '@/api/registration-periods'
import { useInvalidate } from '@/hooks/useInvalidate'
import type { ListParams } from '@/types/api'
import type { RegistrationPeriodInput } from '@/types/registration'

export const registrationPeriodKeys = {
  all: ['registration-periods'] as const,
  list: (params: ListParams) => ['registration-periods', 'list', params] as const,
  current: ['registration-periods', 'current'] as const,
}

export function useRegistrationPeriods(params: ListParams) {
  return useQuery({
    queryKey: registrationPeriodKeys.list(params),
    queryFn: () => periodsApi.listRegistrationPeriods(params),
    placeholderData: keepPreviousData,
  })
}

/** Lựa chọn đợt cho bộ lọc — 100 đợt đủ dùng (mỗi học kỳ một đợt là vài chục năm). */
export function usePeriodOptions() {
  const periods = useRegistrationPeriods({ limit: 100 })
  return (periods.data?.data ?? []).map((p) => ({ value: p.id, label: p.name }))
}

/** Đợt đang mở — sinh viên dùng để biết form đăng ký có mở không. */
export function useCurrentRegistrationPeriod() {
  return useQuery({
    queryKey: registrationPeriodKeys.current,
    queryFn: periodsApi.getCurrentRegistrationPeriod,
  })
}

/** Mọi thao tác ghi đều làm mới cả danh sách lẫn đợt đang mở. */
function useInvalidatePeriods() {
  return useInvalidate(registrationPeriodKeys.all)
}

export function useSaveRegistrationPeriod() {
  const invalidate = useInvalidatePeriods()
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: RegistrationPeriodInput }) =>
      id ? periodsApi.updateRegistrationPeriod(id, input) : periodsApi.createRegistrationPeriod(input),
    onSuccess: invalidate,
  })
}

export function useToggleRegistrationPeriod() {
  const invalidate = useInvalidatePeriods()
  return useMutation({
    mutationFn: ({ id, open }: { id: string; open: boolean }) =>
      open ? periodsApi.openRegistrationPeriod(id) : periodsApi.closeRegistrationPeriod(id),
    onSuccess: invalidate,
  })
}

export function useDeleteRegistrationPeriod() {
  const invalidate = useInvalidatePeriods()
  return useMutation({ mutationFn: periodsApi.deleteRegistrationPeriod, onSuccess: invalidate })
}
