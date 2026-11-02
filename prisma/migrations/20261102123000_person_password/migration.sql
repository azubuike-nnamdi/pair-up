-- AlterTable
ALTER TABLE "Person" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "Person" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
