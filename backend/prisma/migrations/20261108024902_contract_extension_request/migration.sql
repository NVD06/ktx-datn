-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "extensionRejectReason" TEXT,
ADD COLUMN     "extensionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "extensionRequestedTo" TIMESTAMP(3);
