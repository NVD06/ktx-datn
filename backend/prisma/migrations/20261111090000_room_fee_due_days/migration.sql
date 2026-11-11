UPDATE "DormRule"
SET "content" = replace("content", 'hạn thanh toán 14 ngày', 'hạn thanh toán 4 ngày'), "updatedAt" = NOW()
WHERE "content" LIKE '%hạn thanh toán 14 ngày%';
