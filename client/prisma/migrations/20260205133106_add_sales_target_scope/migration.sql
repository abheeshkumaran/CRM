-- CreateEnum
CREATE TYPE "TargetScope" AS ENUM ('INDIVIDUAL', 'HIERARCHY');

-- AlterTable
ALTER TABLE "SalesTarget" ADD COLUMN     "scope" "TargetScope" NOT NULL DEFAULT 'HIERARCHY';
