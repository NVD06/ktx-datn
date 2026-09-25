import type { Contract } from '@/types/contract'

/**
 * Hợp đồng còn hủy được: chưa ký và chưa bị hủy — kể cả đã quá ngày kết thúc
 * (hiển thị "Hết hạn" nhưng trong DB vẫn là DRAFT, đang giữ giường vô ích).
 * Giữ khớp với cancelDraft() ở backend/src/modules/contracts/contract.service.ts.
 */
export function canCancel(contract: Pick<Contract, 'status' | 'signedAt'>): boolean {
  return contract.status === 'DRAFT' || (contract.status === 'EXPIRED' && !contract.signedAt)
}
