-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('NEW_BUSINESS', 'UPSALE');

-- AlterTable
ALTER TABLE "SalesTarget" ADD COLUMN     "opportunityType" "OpportunityType";
