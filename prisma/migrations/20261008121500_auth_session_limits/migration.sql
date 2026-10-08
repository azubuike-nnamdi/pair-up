-- AlterTable
ALTER TABLE "Admin" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "LoginAttempt" ADD COLUMN "email" TEXT;
ALTER TABLE "LoginAttempt" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'magic';

-- CreateIndex
CREATE INDEX "LoginAttempt_kind_ip_createdAt_idx" ON "LoginAttempt"("kind", "ip", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_kind_email_createdAt_idx" ON "LoginAttempt"("kind", "email", "createdAt");
