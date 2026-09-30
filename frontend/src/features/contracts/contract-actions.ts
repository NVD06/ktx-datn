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
