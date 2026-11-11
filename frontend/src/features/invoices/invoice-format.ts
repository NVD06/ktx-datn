import { formatMonth } from '@/lib/format'
import { INVOICE_TYPE } from '@/lib/labels'
import type { InvoiceItem, InvoiceRef } from '@/types/invoice'

const number = (value: string) => Number(value).toLocaleString('vi-VN')

/**
 * Số lượng kèm đơn vị: kWh / m³ của cả phòng, hoặc số tháng tiền phòng (quy tắc nửa tháng).
 * Hóa đơn tiền phòng cũ, trước khi tính theo tháng: cả kỳ ("2026-HK1") hoặc số ngày gia hạn ("…-GH-…").
 */
export function quantityLabel(item: InvoiceItem, period: string) {
  if (item.type === 'ELECTRIC') return `${number(item.quantity)} kWh`
  if (item.type === 'WATER') return `${number(item.quantity)} m³`
  if (period.includes('-GH-')) return `${number(item.quantity)} ngày`
  if (period.includes('-HK')) return 'Cả kỳ'
  return Number(item.quantity) === 1 ? '1 tháng' : 'Nửa tháng'
}

export function invoiceTitle({ type, period }: Pick<InvoiceRef, 'type' | 'period'>) {
  const [, month, topUp] = /^(\d{4}-\d{2})(-BS)?$/.exec(period) ?? []
  return `${INVOICE_TYPE[type].label} ${month ? `${topUp ? 'bổ sung ' : ''}tháng ${formatMonth(month)}` : `kỳ ${period}`}`
}
