CREATE TYPE "NotificationRecipientType" AS ENUM ('ADMIN', 'CLIENT');

CREATE TYPE "NotificationSourceType" AS ENUM ('COMPLIANCE', 'AUDIT');

CREATE TABLE "ChatThreadReadState" (
    "id" TEXT NOT NULL,
    "recipientType" "NotificationRecipientType" NOT NULL,
    "recipientId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatThreadReadState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationReadState" (
    "id" TEXT NOT NULL,
    "recipientType" "NotificationRecipientType" NOT NULL,
    "recipientId" TEXT NOT NULL,
    "sourceType" "NotificationSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationReadState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChatThreadReadState_recipientType_recipientId_clientId_key" ON "ChatThreadReadState"("recipientType", "recipientId", "clientId");

CREATE INDEX "ChatThreadReadState_recipientType_recipientId_lastReadAt_idx" ON "ChatThreadReadState"("recipientType", "recipientId", "lastReadAt");

CREATE INDEX "ChatThreadReadState_clientId_lastReadAt_idx" ON "ChatThreadReadState"("clientId", "lastReadAt");

CREATE UNIQUE INDEX "NotificationReadState_recipientType_recipientId_sourceType_sourceI_key" ON "NotificationReadState"("recipientType", "recipientId", "sourceType", "sourceId");

CREATE INDEX "NotificationReadState_recipientType_recipientId_readAt_idx" ON "NotificationReadState"("recipientType", "recipientId", "readAt");

CREATE INDEX "NotificationReadState_sourceType_sourceId_idx" ON "NotificationReadState"("sourceType", "sourceId");

ALTER TABLE "ChatThreadReadState" ADD CONSTRAINT "ChatThreadReadState_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
