-- Nội quy Vệ sinh theo kỳ nửa tháng và dấu vệ sinh; Admin đã sửa nội dung thì giữ nguyên.
UPDATE "DormRule" SET "content" = E'Ban quản lý kiểm tra vệ sinh phòng theo đợt. Điểm tính theo kỳ nửa tháng (ngày 1–15 và 16–cuối tháng): đầu kỳ phòng có 100 điểm, lỗi của các đợt trừ dồn trong kỳ.
Điểm trừ mỗi lỗi: Rác −5, Bừa bộn −3, WC bẩn −5, Hành lang −3, Nấu ăn −10, Vắng mặt −2.
Kỳ nào phòng còn dưới 60 điểm thì bị cảnh báo và mỗi sinh viên trong phòng bị một dấu.
Quá 5 dấu trong thời gian hợp đồng thì đơn đăng ký phòng và yêu cầu gia hạn không được ưu tiên. Xem điểm và số dấu ở trang Vệ sinh.', "updatedAt" = NOW()
WHERE "title" = 'Vệ sinh' AND "content" = E'Ban quản lý kiểm tra vệ sinh phòng theo đợt. Mỗi tháng phòng bắt đầu với 100 điểm, lỗi của các đợt trừ dồn trong tháng.
Điểm trừ mỗi lỗi: Rác −5, Bừa bộn −3, WC bẩn −5, Hành lang −3, Nấu ăn −10, Vắng mặt −2.
Phòng còn dưới 60 điểm bị cảnh báo. Xem điểm của phòng ở trang Vệ sinh.';
