ALTER TABLE "Consultant"
ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Client"
ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 1;

CREATE TYPE "PasswordResetAccountType" AS ENUM ('CLIENT', 'CONSULTANT');

CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accountType" "PasswordResetAccountType" NOT NULL,
    "accountId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "requestedIp" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_email_createdAt_idx" ON "PasswordResetToken"("email", "createdAt");
CREATE INDEX "PasswordResetToken_accountType_accountId_expiresAt_idx" ON "PasswordResetToken"("accountType", "accountId", "expiresAt");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");
