-- CreateEnum
CREATE TYPE "ComplianceScheduleCategory" AS ENUM ('TRAINING', 'COMMITTEE');

-- CreateEnum
CREATE TYPE "ComplianceNotificationAudience" AS ENUM ('ADMIN', 'CLIENT');

-- CreateEnum
CREATE TYPE "ComplianceNotificationKind" AS ENUM ('EXPIRY_30_DAYS', 'EXPIRY_7_DAYS', 'EXPIRY_1_DAY', 'EXPIRED');

-- AlterTable
ALTER TABLE "ModuleControl" ADD COLUMN     "complianceEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ComplianceLegalDocument" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "remarks" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceLegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceScheduleTemplate" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "category" "ComplianceScheduleCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceScheduleTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceScheduleEvent" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "category" "ComplianceScheduleCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "templateId" TEXT,
    "generatedFileUrl" TEXT,
    "generatedFilePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceScheduleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceNotification" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "audience" "ComplianceNotificationAudience" NOT NULL,
    "kind" "ComplianceNotificationKind" NOT NULL,
    "notifyAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComplianceLegalDocument_clientId_expiryDate_idx" ON "ComplianceLegalDocument"("clientId", "expiryDate");

-- CreateIndex
CREATE INDEX "ComplianceScheduleTemplate_clientId_category_idx" ON "ComplianceScheduleTemplate"("clientId", "category");

-- CreateIndex
CREATE INDEX "ComplianceScheduleEvent_clientId_category_scheduledFor_idx" ON "ComplianceScheduleEvent"("clientId", "category", "scheduledFor");

-- CreateIndex
CREATE INDEX "ComplianceNotification_clientId_audience_createdAt_idx" ON "ComplianceNotification"("clientId", "audience", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceNotification_documentId_audience_kind_key" ON "ComplianceNotification"("documentId", "audience", "kind");

-- AddForeignKey
ALTER TABLE "ComplianceLegalDocument" ADD CONSTRAINT "ComplianceLegalDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceScheduleTemplate" ADD CONSTRAINT "ComplianceScheduleTemplate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceScheduleEvent" ADD CONSTRAINT "ComplianceScheduleEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceScheduleEvent" ADD CONSTRAINT "ComplianceScheduleEvent_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ComplianceScheduleTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceNotification" ADD CONSTRAINT "ComplianceNotification_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceNotification" ADD CONSTRAINT "ComplianceNotification_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ComplianceLegalDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
