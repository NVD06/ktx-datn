-- CreateIndex
CREATE UNIQUE INDEX "HygieneRecord_roomId_checkDate_key" ON "HygieneRecord"("roomId", "checkDate");

-- AddForeignKey
ALTER TABLE "HygieneRecord" ADD CONSTRAINT "HygieneRecord_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

