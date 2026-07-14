-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "organisationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Interaction" ALTER COLUMN "organisationId" DROP NOT NULL;
