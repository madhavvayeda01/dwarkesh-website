CREATE TYPE "ChatSender" AS ENUM ('client', 'admin');

CREATE TABLE "ClientChatMessage" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "sender" "ChatSender" NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClientChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientChatMessage_clientId_createdAt_idx" ON "ClientChatMessage"("clientId", "createdAt");

ALTER TABLE "ClientChatMessage"
ADD CONSTRAINT "ClientChatMessage_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
