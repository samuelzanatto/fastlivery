-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "lastPasswordChange" TIMESTAMP(3),
ADD COLUMN     "requiresPasswordChange" BOOLEAN NOT NULL DEFAULT false;
