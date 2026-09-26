import type { Contract } from '@/types/contract'

type Signed = Pick<Contract, 'status' | 'signedAt'>

/**
 * Hợp đồng còn hủy được: chưa ký và chưa bị hủy — kể cả đã quá ngày kết thúc
 * (hiển thị "Hết hạn" nhưng trong DB vẫn là DRAFT, đang giữ giường vô ích).
 * Giữ khớp với cancelDraft() ở backend/src/modules/contracts/contract.service.ts.
 */
export function canCancel(contract: Signed): boolean {
  return contract.status === 'DRAFT' || (contract.status === 'EXPIRED' && !contract.signedAt)
}

/**
 * Hợp đồng đang ở — gia hạn / chấm dứt được: ACTIVE, kể cả đã quá ngày kết thúc
 * mà chưa trả phòng (hiển thị "Hết hạn" nhưng trong DB vẫn ACTIVE, giường vẫn có người).
 */
export function isRunning(contract: Signed): boolean {
  return contract.status === 'ACTIVE' || (contract.status === 'EXPIRED' && !!contract.signedAt)
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Tiền gia hạn xem trước trên dialog — số ngày ở thêm × đơn giá ngày, đơn giá ngày
 * = giá kỳ ÷ số ngày của kỳ, làm tròn đồng. Backend tính lại khi lưu.
 * Giữ khớp với extensionFee() ở backend/src/modules/contracts/contract.service.ts.
 */
export function extensionFee(contract: Pick<Contract, 'price' | 'endDate' | 'period'>, newEndIso: string) {
  const { stayStartAt, stayEndAt } = contract.period
  const termDays = Math.max(1, Math.round((Date.parse(stayEndAt) - Date.parse(stayStartAt)) / DAY_MS))
  const days = Math.round((Date.parse(newEndIso) - Date.parse(contract.endDate)) / DAY_MS)
  const dailyRate = Math.round(Number(contract.price) / termDays)
  return { days, dailyRate, amount: days * dailyRate }
}
