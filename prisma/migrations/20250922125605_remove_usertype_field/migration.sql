/*
  Warnings:

  - You are about to drop the column `userType` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "userType";

-- DropEnum
DROP TYPE "public"."UserType";
