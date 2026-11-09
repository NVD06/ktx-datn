-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "recipientId" TEXT;

-- CreateIndex
CREATE INDEX "Announcement_recipientId_createdAt_idx" ON "Announcement"("recipientId", "createdAt");

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
