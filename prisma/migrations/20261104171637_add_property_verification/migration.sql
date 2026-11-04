-- CreateEnum
CREATE TYPE "PropertyCategory" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'LAND', 'VILLA', 'APARTMENT', 'ESTATE');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION', 'VERIFIED', 'REJECTED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('OWNER_ID', 'OWNERSHIP_DEED', 'TAX_RECEIPT', 'PROPERTY_PHOTO', 'LOCATION_PROOF', 'OTHER');

-- CreateTable
CREATE TABLE "owners" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "PropertyCategory" NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'Kerala',
    "pincode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "price" DECIMAL(15,2) NOT NULL,
    "area" DOUBLE PRECISION NOT NULL,
    "area_unit" TEXT NOT NULL DEFAULT 'sqft',
    "status" "PropertyStatus" NOT NULL DEFAULT 'SUBMITTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_documents" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "type" "DocumentType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "public_id" TEXT,
    "file_name" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_verifications" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "identity_verified" BOOLEAN NOT NULL DEFAULT false,
    "ownership_verified" BOOLEAN NOT NULL DEFAULT false,
    "location_verified" BOOLEAN NOT NULL DEFAULT false,
    "photos_verified" BOOLEAN NOT NULL DEFAULT false,
    "site_visit_completed" BOOLEAN NOT NULL DEFAULT false,
    "rejection_reason" TEXT,
    "verified_by_id" UUID,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_history" (
    "id" UUID NOT NULL,
    "verification_id" UUID NOT NULL,
    "changed_by_id" UUID NOT NULL,
    "old_status" "VerificationStatus",
    "new_status" "VerificationStatus" NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "owners_phone_key" ON "owners"("phone");

-- CreateIndex
CREATE INDEX "properties_owner_id_idx" ON "properties"("owner_id");

-- CreateIndex
CREATE INDEX "properties_status_idx" ON "properties"("status");

-- CreateIndex
CREATE INDEX "property_documents_property_id_idx" ON "property_documents"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "property_verifications_property_id_key" ON "property_verifications"("property_id");

-- CreateIndex
CREATE INDEX "verification_history_verification_id_idx" ON "verification_history"("verification_id");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_documents" ADD CONSTRAINT "property_documents_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_verifications" ADD CONSTRAINT "property_verifications_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_history" ADD CONSTRAINT "verification_history_verification_id_fkey" FOREIGN KEY ("verification_id") REFERENCES "property_verifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
