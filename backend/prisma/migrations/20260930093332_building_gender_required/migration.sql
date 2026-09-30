/*
  Warnings:

  - Made the column `gender` on table `Building` required. This step will fail if there are existing NULL values in that column.

*/
-- Bỏ tòa hỗn hợp: mọi tòa là tòa nam hoặc tòa nữ. Còn tòa chưa đặt giới tính thì dừng với
-- thông báo nêu tên tòa, thay cho lỗi chung chung của SET NOT NULL — đặt Nam/Nữ rồi deploy lại.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Building" WHERE "gender" IS NULL) THEN
    RAISE EXCEPTION 'Còn tòa hỗn hợp chưa có giới tính: %. Đặt Nam/Nữ cho các tòa này rồi chạy lại migration.',
      (SELECT string_agg("name", ', ') FROM "Building" WHERE "gender" IS NULL);
  END IF;
END $$;

-- AlterTable
ALTER TABLE "Building" ALTER COLUMN "gender" SET NOT NULL;
