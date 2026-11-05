/*
  Warnings:

  - A unique constraint covering the columns `[razorpay_payment_link_id]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[razorpay_payment_id]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('MANUAL', 'RAZORPAY');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "gateway" "PaymentGateway" NOT NULL DEFAULT 'RAZORPAY',
ADD COLUMN     "payment_link_expires_at" TIMESTAMP(3),
ADD COLUMN     "razorpay_payment_id" TEXT,
ADD COLUMN     "razorpay_payment_link_id" TEXT,
ADD COLUMN     "razorpay_payment_status" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpay_payment_link_id_key" ON "payments"("razorpay_payment_link_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpay_payment_id_key" ON "payments"("razorpay_payment_id");
