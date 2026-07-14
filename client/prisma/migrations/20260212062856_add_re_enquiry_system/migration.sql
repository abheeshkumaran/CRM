-- AlterEnum
ALTER TYPE "LeadStatus" ADD VALUE 're_enquiry';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "isReEnquiry" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastEnquiryDate" TIMESTAMP(3),
ADD COLUMN     "originalLeadId" TEXT,
ADD COLUMN     "reEnquiryCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Lead_isReEnquiry_idx" ON "Lead"("isReEnquiry");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");
