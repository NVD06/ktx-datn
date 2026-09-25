-- Hủy hợp đồng khi còn chờ ký: SV từ chối ký, hoặc Manager hủy để trả giường.
-- CANCELLED khác TERMINATED (hợp đồng đang ở bị kết thúc sớm) để báo cáo không lẫn.
ALTER TYPE "ContractStatus" ADD VALUE 'CANCELLED';

-- Ai kết thúc hợp đồng (SV hay Manager) — dùng chung cho hủy và chấm dứt.
ALTER TABLE "Contract" ADD COLUMN "endedById" TEXT;

ALTER TABLE "Contract" ADD CONSTRAINT "Contract_endedById_fkey" FOREIGN KEY ("endedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
