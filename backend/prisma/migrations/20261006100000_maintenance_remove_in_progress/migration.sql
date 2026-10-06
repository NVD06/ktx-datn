-- Bỏ bước "Đang xử lý": yêu cầu đang ở bước này chuyển về "Đã tiếp nhận" (bước liền trước).
UPDATE "MaintenanceRequest" SET "status" = 'RECEIVED' WHERE "status" = 'IN_PROGRESS';

-- AlterEnum
BEGIN;
CREATE TYPE "RequestStatus_new" AS ENUM ('PENDING', 'RECEIVED', 'DONE', 'CONFIRMED', 'REJECTED');
ALTER TABLE "public"."MaintenanceRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "MaintenanceRequest" ALTER COLUMN "status" TYPE "RequestStatus_new" USING ("status"::text::"RequestStatus_new");
ALTER TYPE "RequestStatus" RENAME TO "RequestStatus_old";
ALTER TYPE "RequestStatus_new" RENAME TO "RequestStatus";
DROP TYPE "public"."RequestStatus_old";
ALTER TABLE "MaintenanceRequest" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "MaintenanceRequest" DROP COLUMN "startedAt";

