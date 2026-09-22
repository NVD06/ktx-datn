import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as registrationsApi from '@/api/registrations'
import { useProfile } from '@/features/profile/hooks/useProfile'
import {
  registrationPeriodKeys,
  useCurrentRegistrationPeriod,
} from '@/features/registration-periods/hooks/useRegistrationPeriods'

export const registrationKeys = {
  all: ['registrations'] as const,
  mine: ['registrations', 'mine'] as const,
}

export function useMyRegistrations() {
  return useQuery({ queryKey: registrationKeys.mine, queryFn: registrationsApi.listMyRegistrations })
}

/** Nộp/hủy đơn làm đổi số đơn của đợt nên làm mới cả đợt đăng ký. */
function useInvalidateRegistrations() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: registrationKeys.all }),
      queryClient.invalidateQueries({ queryKey: registrationPeriodKeys.all }),
    ])
}

export function useCreateRegistration() {
  const invalidate = useInvalidateRegistrations()
  return useMutation({ mutationFn: registrationsApi.createRegistration, onSuccess: invalidate })
}

export function useCancelRegistration() {
  const invalidate = useInvalidateRegistrations()
  return useMutation({ mutationFn: registrationsApi.cancelRegistration, onSuccess: invalidate })
}

/**
 * Sinh viên nộp đơn được chưa, và nếu chưa thì vì sao — để tắt nút "Đăng ký"
 * và báo sớm. Backend vẫn kiểm tra lại tất cả khi nộp.
 */
export function useRegistrationEligibility() {
  const period = useCurrentRegistrationPeriod()
  const profile = useProfile()
  const registrations = useMyRegistrations()

  const currentPeriod = period.data ?? null
  const activeInPeriod = registrations.data?.find(
    (r) => r.periodId === currentPeriod?.id && (r.status === 'PENDING' || r.status === 'APPROVED'),
  )
  return {
    isLoading: period.isPending || profile.isPending || registrations.isPending,
    period: currentPeriod,
    profile: profile.data,
    activeInPeriod,
    canSubmit: !!currentPeriod && !!profile.data?.isComplete && !activeInPeriod,
  }
}
