<h1 align="center">Quản lý Ký túc xá</h1>

<h4 align="center">Website quản lý ký túc xá cho sinh viên – Đồ án tốt nghiệp</h4>

<p align="center">
  <a href="#tính-năng">Tính năng</a> •
  <a href="#cài-đặt">Cài đặt</a> •
  <a href="#kiểm-thử-tải">Kiểm thử tải</a> •
  <a href="#công-nghệ">Công nghệ</a>
</p>

## Tính năng

- **Phân quyền theo vai trò** — Quản trị viên, Quản lý tòa nhà và Sinh viên; Quản lý chỉ thấy dữ liệu tòa mình phụ trách.
- **Cơ sở vật chất** — Quản lý tòa nhà, loại phòng, phòng và giường.
- **Đăng ký ở và hợp đồng** — Sinh viên nộp đơn, Quản lý duyệt và xếp giường, sinh viên ký hợp đồng trực tuyến.
- **Hóa đơn** — Tự động lập hóa đơn tiền phòng hằng tháng, chốt và chia tiền điện nước theo đầu người.
- **Thanh toán VNPay** — Thanh toán trực tuyến, xác nhận qua ReturnURL và IPN.
- **Sửa chữa và vệ sinh** — Gửi, xử lý yêu cầu sửa chữa; chấm điểm vệ sinh theo đợt bằng lỗi vi phạm.
- **Thông báo và nội quy** — Bảng tin của ban quản lý cho toàn ký túc xá hoặc từng tòa; nội quy do Quản trị viên soạn.
- **Báo cáo** — Dashboard, báo cáo lấp đầy, doanh thu và công nợ, sửa chữa và vệ sinh.

## Cài đặt

1. Cài Node.js ≥ 22.12 và PostgreSQL 17, tạo cơ sở dữ liệu `ktx`.
2. Chép `backend/.env.example` thành `backend/.env`, điền `DATABASE_URL` và `AUTH_SECRET`.
3. Chạy máy chủ: `cd backend && npm install && npx prisma migrate dev && npx prisma db seed && npm run dev`
4. Chạy giao diện ở terminal khác: `cd frontend && npm install && npm run dev`
5. Mở http://localhost:5173.

## Kiểm thử tải

Dùng k6 trên cơ sở dữ liệu riêng `ktx_tai`, không đụng tới dữ liệu đang dùng.

1. Cài k6: `winget install k6 --source winget`.
2. Chép `backend/.env` thành `backend/.env.tai`, đổi tên cơ sở dữ liệu trong `DATABASE_URL` thành `ktx_tai`, thêm `PORT=3100` và `NODE_ENV=production`.
3. Sinh dữ liệu (1.600 sinh viên, 800 hợp đồng, 5.600 hóa đơn; mật khẩu `123456`) rồi chạy máy chủ: `cd backend && npm run seed:tai && npm run build && npm run start:tai`
4. Ở thư mục gốc, mở terminal khác và chạy một trong ba kịch bản. Kết quả ghi vào `bang-chung/5-kiem-thu-tai/`.
   - Thường ngày, 100 sinh viên và 10 quản lý trong 3 phút: `k6 run kiem-thu-tai/tai.js`
   - Mở đợt đăng ký, 749 sinh viên nộp đơn trong khoảng 40 giây: `k6 run -e KB=mo-dot kiem-thu-tai/tai.js`. Chạy lại `npm run seed:tai` trước mỗi lần.
   - Tìm ngưỡng chịu tải: `k6 run -e KB=nguong -e VUS=400 kiem-thu-tai/tai.js`

## Công nghệ

- React, TypeScript, Tailwind CSS, shadcn/ui
- Node.js, Express, Auth.js
- PostgreSQL, Prisma
