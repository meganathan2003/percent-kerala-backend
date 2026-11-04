-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('UPI');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'REFUNDED');

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "payment_number" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transaction_reference" TEXT,
    "payment_proof_url" TEXT,
    "payment_proof_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "verified_by_id" UUID,
    "verified_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_number_key" ON "payments"("payment_number");

-- CreateIndex
CREATE INDEX "payments_quotation_id_idx" ON "payments"("quotation_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
