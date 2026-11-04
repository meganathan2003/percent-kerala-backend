-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "rejected_at" TIMESTAMP(3),
ADD COLUMN     "rejected_by_id" UUID;
