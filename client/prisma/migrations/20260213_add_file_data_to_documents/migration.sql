-- AlterTable
ALTER TABLE "Document" ADD COLUMN "fileData" BYTEA;
ALTER TABLE "Document" ALTER COLUMN "fileUrl" DROP NOT NULL;

-- Update existing documents to have null fileData (they will need to be re-uploaded)
-- The fileUrl field is now optional for backward compatibility
