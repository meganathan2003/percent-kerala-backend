-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "quotations" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "quotation_number" TEXT NOT NULL,
    "package_name" TEXT NOT NULL,
    "service_fee" DECIMAL(12,2) NOT NULL,
    "advertisement_budget" DECIMAL(12,2) NOT NULL,
    "additional_charges" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotations_quotation_number_key" ON "quotations"("quotation_number");

-- CreateIndex
CREATE INDEX "quotations_property_id_idx" ON "quotations"("property_id");

-- CreateIndex
CREATE INDEX "quotations_status_idx" ON "quotations"("status");

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
