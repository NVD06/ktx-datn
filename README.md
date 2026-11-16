<h1 align="center">Quản lý Ký túc xá</h1>

<h4 align="center">Website quản lý ký túc xá cho sinh viên – Đồ án tốt nghiệp</h4>

<p align="center">
  <a href="#tính-năng">Tính năng</a> •
  <a href="#cài-đặt">Cài đặt</a> •
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

## Công nghệ

- React, TypeScript, Tailwind CSS, shadcn/ui
- Node.js, Express, Auth.js
- PostgreSQL, Prisma
