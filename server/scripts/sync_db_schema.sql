-- 1. Add column to Organisation
ALTER TABLE "Organisation" ADD COLUMN IF NOT EXISTS "dailyReportEmailEnabled" BOOLEAN NOT NULL DEFAULT false;

-- 2. Add column to Team
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;

-- 3. Add column to Lead
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "secondaryPhone" TEXT;

-- 4. Create CallRecording table
CREATE TABLE IF NOT EXISTS "CallRecording" (
  "id" TEXT NOT NULL,
  "leadId" TEXT,
  "duration" INTEGER NOT NULL DEFAULT 0,
  "hardwareDuration" INTEGER,
  "fileUrl" TEXT NOT NULL,
  "callType" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CallRecording_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CallRecording_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CallRecording_leadId_idx" ON "CallRecording"("leadId");

-- 5. Add column to Account
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;

-- 6. Add column to Contact
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;

-- 7. Add column to Opportunity
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;

-- 8. Add column to Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isCustom" BOOLEAN NOT NULL DEFAULT false;

-- 9. Add column to LeadProduct
ALTER TABLE "LeadProduct" ADD COLUMN IF NOT EXISTS "customName" TEXT;

-- 10. Add columns to AccountProduct
ALTER TABLE "AccountProduct" ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "AccountProduct" ADD COLUMN IF NOT EXISTS "customName" TEXT;

-- 11. Add column to Quote
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;

-- 12. Add columns to Task
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "notifiedAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "notified30MinAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "notifiedDueAt" TIMESTAMP WITH TIME ZONE;

-- 13. Create FollowUp Status and Priority Enums & FollowUp table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FollowUpStatus') THEN
        CREATE TYPE "FollowUpStatus" AS ENUM ('not_started', 'in_progress', 'completed', 'deferred');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FollowUpPriority') THEN
        CREATE TYPE "FollowUpPriority" AS ENUM ('high', 'medium', 'low');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS "FollowUp" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'not_started',
    "priority" "FollowUpPriority" NOT NULL DEFAULT 'medium',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "leadId" TEXT,
    "contactId" TEXT,
    "accountId" TEXT,
    "opportunityId" TEXT,
    "assignedToId" TEXT,
    "createdById" TEXT,
    "organisationId" TEXT,
    "branchId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt" TIMESTAMP(3),
    "notified30MinAt" TIMESTAMP(3),
    "notifiedDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FollowUp_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FollowUp_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FollowUp_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FollowUp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FollowUp_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FollowUp_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FollowUp_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "FollowUp_branchId_idx" ON "FollowUp"("branchId");
CREATE INDEX IF NOT EXISTS "FollowUp_organisationId_idx" ON "FollowUp"("organisationId");
CREATE INDEX IF NOT EXISTS "FollowUp_leadId_idx" ON "FollowUp"("leadId");
CREATE INDEX IF NOT EXISTS "FollowUp_assignedToId_idx" ON "FollowUp"("assignedToId");

-- 14. Add columns to Interaction
ALTER TABLE "Interaction" ADD COLUMN IF NOT EXISTS "hardwareDuration" INTEGER;
ALTER TABLE "Interaction" ADD COLUMN IF NOT EXISTS "hardwareId" TEXT;
ALTER TABLE "Interaction" ADD COLUMN IF NOT EXISTS "callSessionId" TEXT;

-- 15. Add column to Campaign
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;

-- 16. Add column to SalesTarget
ALTER TABLE "SalesTarget" ADD COLUMN IF NOT EXISTS "previousOwnerId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 17. Add column to Goal
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "previousOwnerId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 18. Add columns to Case
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;

-- 19. Add column to CallSettings
ALTER TABLE "CallSettings" ADD COLUMN IF NOT EXISTS "syncNonCrmContacts" BOOLEAN NOT NULL DEFAULT true;

-- 20. Add column to WebForm
ALTER TABLE "WebForm" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- 21. Add column to Document
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;

-- 22. Add column to Branch
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;

-- 23. Create SiteFAQ table
CREATE TABLE IF NOT EXISTS "SiteFAQ" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SiteFAQ_pkey" PRIMARY KEY ("id")
);
