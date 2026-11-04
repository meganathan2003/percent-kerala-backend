-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "payment_link" TEXT,
ADD COLUMN     "payment_link_shared_at" TIMESTAMP(3),
ADD COLUMN     "shared_by_id" UUID,
ALTER COLUMN "method" SET DEFAULT 'UPI';

-- CreateTable
CREATE TABLE "payment_configurations" (
    "id" UUID NOT NULL,
    "upi_id" TEXT NOT NULL,
    "upi_name" TEXT NOT NULL,
    "upi_link" TEXT,
    "qr_code_url" TEXT,
    "qr_code_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_configurations_pkey" PRIMARY KEY ("id")
);
