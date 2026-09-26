/**
 * Hạn thanh toán hóa đơn tiền phòng, tính từ lúc ký.
 * Giữ khớp với INVOICE_DUE_DAYS trong backend/src/config/constants.ts.
 */
export const ROOM_FEE_DUE_DAYS = 14

/**
 * Điều khoản chung in trên mọi hợp đồng. Thông tin riêng từng hợp đồng (giường,
 * giá, thời gian ở) nằm ở các thẻ phía trên. Nội dung phải khớp với luật nghiệp
 * vụ hệ thống đang chạy: hạn thanh toán, cách chia tiền điện nước, gia hạn.
 */
export const CONTRACT_TERMS = [
  'Sinh viên ở đúng giường ghi trong hợp đồng, không tự ý chuyển phòng, chuyển giường hoặc cho người khác ở cùng.',
  `Tiền phòng đóng một lần cho cả kỳ, trong vòng ${ROOM_FEE_DUE_DAYS} ngày kể từ ngày ký. Hóa đơn tiền phòng được lập ngay khi ký hợp đồng.`,
  'Tiền điện, nước tính hằng tháng theo chỉ số công tơ của phòng, chia đều cho các sinh viên đang ở trong phòng.',
  'Giữ gìn tài sản và vệ sinh chung. Hư hỏng cần sửa chữa thì gửi yêu cầu qua hệ thống; hư hỏng do lỗi cá nhân phải bồi thường.',
  'Chấp hành nội quy ký túc xá. Vi phạm nghiêm trọng hoặc không thanh toán đúng hạn, ban quản lý có thể chấm dứt hợp đồng trước thời hạn.',
  'Hợp đồng hết hiệu lực khi hết thời gian ở. Muốn ở tiếp, sinh viên đăng ký ở đợt sau hoặc đề nghị ban quản lý gia hạn.',
] as const
