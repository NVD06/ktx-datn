/**
 * Hạn thanh toán hóa đơn tiền phòng, tính từ ngày lập (ngày 1 tháng sau).
 * Giữ khớp với INVOICE_DUE_DAYS trong backend/src/config/constants.ts.
 */
export const ROOM_FEE_DUE_DAYS = 14

/**
 * Quy tắc nửa tháng: tháng ở dưới từng này ngày tính nửa tháng, từ đó trở lên tính cả tháng.
 * Giữ khớp với HALF_MONTH_DAYS trong backend/src/config/constants.ts.
 */
export const HALF_MONTH_DAYS = 15

/** Cách tính tiền phòng — dùng chung cho điều khoản hợp đồng và hộp xác nhận ký. */
export const ROOM_FEE_RULE =
  `Tiền phòng tính theo tháng, trả sau: ngày 1 hằng tháng hệ thống lập hóa đơn tiền phòng của tháng trước, ` +
  `hạn thanh toán ${ROOM_FEE_DUE_DAYS} ngày. Tháng ở dưới ${HALF_MONTH_DAYS} ngày (tháng vào ở, tháng trả phòng) ` +
  `tính nửa tháng, từ ${HALF_MONTH_DAYS} ngày trở lên tính cả tháng.`

/**
 * Điều khoản chung in trên mọi hợp đồng. Thông tin riêng từng hợp đồng (giường,
 * giá, thời gian ở) nằm ở các thẻ phía trên. Nội dung phải khớp với luật nghiệp
 * vụ hệ thống đang chạy: hạn thanh toán, cách chia tiền điện nước, gia hạn.
 */
export const CONTRACT_TERMS = [
  'Sinh viên ở đúng giường ghi trong hợp đồng, không tự ý chuyển phòng, chuyển giường hoặc cho người khác ở cùng.',
  ROOM_FEE_RULE,
  'Tiền điện, nước tính hằng tháng theo chỉ số công tơ của phòng, chia đều cho các sinh viên đang ở trong phòng.',
  'Giữ gìn tài sản và vệ sinh chung. Hư hỏng cần sửa chữa thì gửi yêu cầu qua hệ thống; hư hỏng do lỗi cá nhân phải bồi thường.',
  'Chấp hành nội quy ký túc xá. Vi phạm nghiêm trọng hoặc không thanh toán đúng hạn, ban quản lý có thể chấm dứt hợp đồng trước thời hạn.',
  'Hợp đồng hết hiệu lực khi hết thời gian ở. Muốn ở tiếp, sinh viên đăng ký ở đợt sau hoặc đề nghị ban quản lý gia hạn.',
] as const
