-- Chuẩn bị cho US-03 (duyệt đơn & hợp đồng).

-- 1. Lý do chấm dứt hợp đồng (US-03.4).
ALTER TABLE "Contract" ADD COLUMN "terminationReason" TEXT;

-- 2. Mã học kỳ của đợt — thành Invoice.period của hóa đơn tiền phòng khi ký
--    hợp đồng. Thêm cột cho phép NULL, điền tạm theo tháng bắt đầu ở (giờ Việt
--    Nam) cho các đợt đã có, rồi mới đặt NOT NULL — Admin sửa lại nếu chưa đúng:
--      tháng 8–12 → <năm>-HK1 · tháng 1–5 → <năm-1>-HK2 · tháng 6–7 → <năm-1>-HE
ALTER TABLE "RegistrationPeriod" ADD COLUMN "term" TEXT;

UPDATE "RegistrationPeriod" AS p
SET "term" = CASE
    WHEN EXTRACT(MONTH FROM v.local) >= 8 THEN EXTRACT(YEAR FROM v.local)::int::text || '-HK1'
    WHEN EXTRACT(MONTH FROM v.local) <= 5 THEN (EXTRACT(YEAR FROM v.local)::int - 1)::text || '-HK2'
    ELSE (EXTRACT(YEAR FROM v.local)::int - 1)::text || '-HE'
  END
FROM (
  SELECT id, ("stayStartAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Ho_Chi_Minh' AS local
  FROM "RegistrationPeriod"
) AS v
WHERE v.id = p.id;

ALTER TABLE "RegistrationPeriod" ALTER COLUMN "term" SET NOT NULL;

-- 3. Mỗi giường tối đa 1 hợp đồng đang giữ (DRAFT/ACTIVE) — chặn tranh chấp
--    giường ở tầng database. Khai báo trong schema.prisma (preview partialIndexes).
CREATE UNIQUE INDEX "Contract_bedId_holding_key" ON "Contract"("bedId") WHERE (status IN ('DRAFT', 'ACTIVE'));
