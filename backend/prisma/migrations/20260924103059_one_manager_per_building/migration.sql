-- Mỗi tòa tối đa 1 Manager (Manager ↔ tòa là quan hệ 1–1).
-- Chạy được khi chưa có tòa nào đang gán 2 Manager — nếu có, gỡ bớt trước:
--   SELECT "buildingId", count(*) FROM "User" WHERE "buildingId" IS NOT NULL GROUP BY 1 HAVING count(*) > 1;
CREATE UNIQUE INDEX "User_buildingId_key" ON "User"("buildingId");
