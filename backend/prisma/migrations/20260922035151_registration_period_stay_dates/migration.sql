-- Tách "thời gian ở" khỏi "thời gian nhận đơn" của đợt đăng ký.
-- Thêm cột cho phép NULL, điền tạm bằng thời gian nhận đơn cho các đợt đã có,
-- rồi mới đặt NOT NULL — Admin sửa lại ngày ở cho đúng trên giao diện.
ALTER TABLE "RegistrationPeriod" ADD COLUMN "stayStartAt" TIMESTAMP(3),
ADD COLUMN "stayEndAt" TIMESTAMP(3);

UPDATE "RegistrationPeriod" SET "stayStartAt" = "startAt", "stayEndAt" = "endAt";

ALTER TABLE "RegistrationPeriod" ALTER COLUMN "stayStartAt" SET NOT NULL,
ALTER COLUMN "stayEndAt" SET NOT NULL;
