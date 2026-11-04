/*
  Warnings:

  - You are about to drop the column `refresh_token_hash` on the `admin_users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "admin_users" DROP COLUMN "refresh_token_hash";
