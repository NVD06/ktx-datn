-- CreateTable
CREATE TABLE "DormRule" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DormRule_pkey" PRIMARY KEY ("id")
);

-- Nội quy ban đầu, Admin sửa lại ở trang Nội quy.
INSERT INTO "DormRule" ("id", "title", "content", "sortOrder", "updatedAt") VALUES
(gen_random_uuid()::text, 'Chỗ ở', E'Ở đúng giường ghi trong hợp đồng, không tự ý chuyển phòng, chuyển giường hoặc cho người khác ở cùng.\nHợp đồng hết hiệu lực khi hết thời gian ở. Muốn ở tiếp, đăng ký ở đợt sau hoặc đề nghị ban quản lý gia hạn.', 1, NOW()),
(gen_random_uuid()::text, 'Thanh toán', E'Tiền phòng tính theo tháng, trả trước: hóa đơn tháng đầu được lập ngay khi ký hợp đồng, các tháng sau lập vào ngày 1 hằng tháng, hạn thanh toán 14 ngày kể từ ngày lập.\nTháng ở dưới 15 ngày (tháng vào ở, tháng trả phòng) tính nửa tháng, từ 15 ngày trở lên tính cả tháng.\nTiền điện, nước tính hằng tháng theo chỉ số công tơ của phòng, chia đều cho các sinh viên đang ở trong phòng.\nThanh toán trực tuyến qua VNPay ở trang Hóa đơn, trạng thái cập nhật tự động sau khi giao dịch thành công.', 2, NOW()),
(gen_random_uuid()::text, 'Vệ sinh', E'Ban quản lý kiểm tra vệ sinh phòng theo đợt. Mỗi tháng phòng bắt đầu với 100 điểm, lỗi của các đợt trừ dồn trong tháng.\nĐiểm trừ mỗi lỗi: Rác −5, Bừa bộn −3, WC bẩn −5, Hành lang −3, Nấu ăn −10, Vắng mặt −2.\nPhòng còn dưới 60 điểm bị cảnh báo. Xem điểm của phòng ở trang Vệ sinh.', 3, NOW()),
(gen_random_uuid()::text, 'Tài sản và sửa chữa', E'Giữ gìn tài sản và vệ sinh chung. Hư hỏng do lỗi cá nhân phải bồi thường.\nHư hỏng cần sửa thì gửi yêu cầu ở trang Sửa chữa; khi ban quản lý báo đã sửa xong, kiểm tra rồi bấm xác nhận.', 4, NOW()),
(gen_random_uuid()::text, 'Kỷ luật', E'Vi phạm nghiêm trọng nội quy hoặc không thanh toán đúng hạn, ban quản lý có thể chấm dứt hợp đồng trước thời hạn.', 5, NOW());
