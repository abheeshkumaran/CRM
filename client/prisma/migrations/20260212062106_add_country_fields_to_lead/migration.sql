-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "country" TEXT,
ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "phoneCountryCode" TEXT;

-- AlterTable
ALTER TABLE "Organisation" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "brochureUrl" TEXT;

-- CreateTable
CREATE TABLE "ProductShare" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "productId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "youtubeUrl" TEXT,
    "customTitle" TEXT,
    "customDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductShare_slug_key" ON "ProductShare"("slug");

-- CreateIndex
CREATE INDEX "ProductShare_slug_idx" ON "ProductShare"("slug");

-- CreateIndex
CREATE INDEX "ProductShare_organisationId_idx" ON "ProductShare"("organisationId");

-- CreateIndex
CREATE INDEX "ProductShare_productId_idx" ON "ProductShare"("productId");

-- CreateIndex
CREATE INDEX "Lead_countryCode_idx" ON "Lead"("countryCode");

-- AddForeignKey
ALTER TABLE "ProductShare" ADD CONSTRAINT "ProductShare_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductShare" ADD CONSTRAINT "ProductShare_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductShare" ADD CONSTRAINT "ProductShare_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
