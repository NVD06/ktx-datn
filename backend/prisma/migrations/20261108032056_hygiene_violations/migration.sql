-- CreateEnum
CREATE TYPE "HygieneViolation" AS ENUM ('TRASH', 'MESSY', 'DIRTY_WC', 'CORRIDOR', 'COOKING', 'ABSENT');

-- AlterTable
ALTER TABLE "HygieneRecord" ADD COLUMN     "violations" "HygieneViolation"[] DEFAULT ARRAY[]::"HygieneViolation"[];
