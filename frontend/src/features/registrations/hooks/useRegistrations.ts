import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import * as registrationsApi from '@/api/registrations'
import { useProfile } from '@/features/profile/hooks/useProfile'
import { contractKeys } from '@/features/contracts/hooks/useContracts'
import { roomKeys } from '@/features/rooms/hooks/useRooms'
import {
  registrationPeriodKeys,
  useCurrentRegistrationPeriod,
} from '@/features/registration-periods/hooks/useRegistrationPeriods'
import { useInvalidate } from '@/hooks/useInvalidate'
import type { ListParams } from '@/types/api'

export const registrationKeys = {
  all: ['registrations'] as const,
  list: (params: ListParams) => ['registrations', 'list', params] as const,
  mine: ['registrations', 'mine'] as const,
}

export function useRegistrations(params: ListParams) {
  return useQuery({
    queryKey: registrationKeys.list(params),
    queryFn: () => registrationsApi.listRegistrations(params),
    placeholderData: keepPreviousData,
  })
}

export function useMyRegistrations() {
  return useQuery({ queryKey: registrationKeys.mine, queryFn: registrationsApi.listMyRegistrations })
}

/** Nộp/hủy đơn làm đổi số đơn của đợt nên làm mới cả đợt đăng ký. */
function useInvalidateRegistrations() {
  return useInvalidate(registrationKeys.all, registrationPeriodKeys.all)
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
 * Duyệt đơn + xếp giường, sinh hợp đồng chờ ký. Làm mới cả khi LỖI: 409 thường nghĩa
 * là dữ liệu trên màn hình đã cũ (giường vừa bị người khác lấy, đơn vừa được người
 * khác xử lý), nên tải lại danh sách đơn và giường trống để Manager chọn lại cho đúng.
 */
export function useApproveRegistration() {
  const invalidate = useInvalidate(registrationKeys.all, roomKeys.all, contractKeys.all)
  return useMutation({
    mutationFn: ({ id, bedId }: { id: string; bedId: string }) =>
      registrationsApi.approveRegistration(id, bedId),
    onSettled: invalidate,
  })
}

export function useRejectRegistration() {
  const invalidate = useInvalidate(registrationKeys.all)
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: string; reviewNote: string }) =>
      registrationsApi.rejectRegistration(id, reviewNote),
    onSettled: invalidate,
  })
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
