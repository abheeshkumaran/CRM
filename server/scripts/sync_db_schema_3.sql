-- 1. Organisation whatsAppScrapingEnabled and leadStatuses
ALTER TABLE "Organisation" ADD COLUMN IF NOT EXISTS "whatsAppScrapingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organisation" ADD COLUMN IF NOT EXISTS "leadStatuses" JSONB;

-- 2. Lead.deletedAt and isDeleted
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;

-- 3. Opportunity.lostReason
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "lostReason" TEXT;

-- 4. Product.branchId
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "branchId" TEXT REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Task.previousOwnerId
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "previousOwnerId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. WebForm.status
ALTER TABLE "WebForm" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
