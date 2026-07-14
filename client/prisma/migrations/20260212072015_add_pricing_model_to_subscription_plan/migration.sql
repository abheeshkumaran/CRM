-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('per_user', 'flat_rate');

-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN     "pricePerUser" DOUBLE PRECISION,
ADD COLUMN     "pricingModel" "PricingModel" NOT NULL DEFAULT 'flat_rate';
