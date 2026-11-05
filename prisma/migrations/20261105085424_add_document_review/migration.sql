/*
  Warnings:

  - You are about to drop the column `is_verified` on the `property_documents` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `property_documents` table without a default value. This is not possible if the table is not empty.
  - Made the column `public_id` on table `property_documents` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "DocumentReviewStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "property_documents" DROP COLUMN "is_verified",
ADD COLUMN     "file_size" INTEGER,
ADD COLUMN     "format" TEXT,
ADD COLUMN     "resource_type" TEXT NOT NULL DEFAULT 'raw',
ADD COLUMN     "review_remarks" TEXT,
ADD COLUMN     "review_status" "DocumentReviewStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by_id" UUID,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "public_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "property_documents_review_status_idx" ON "property_documents"("review_status");
