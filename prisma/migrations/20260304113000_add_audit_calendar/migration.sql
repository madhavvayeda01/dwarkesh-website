-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('ENV_ADMIN', 'CONSULTANT');

-- CreateEnum
CREATE TYPE "AuditScheduleStatus" AS ENUM (
  'DRAFT',
  'SCHEDULED',
  'VISIT_PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'RESCHEDULED',
  'CANCELLED',
  'OVERDUE'
);

-- CreateEnum
CREATE TYPE "AuditVisitStatus" AS ENUM ('PLANNED', 'DONE', 'MISSED', 'RESCHEDULED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AuditMode" AS ENUM ('ONSITE', 'REMOTE', 'HYBRID');

-- CreateEnum
CREATE TYPE "AuditChecklistSource" AS ENUM ('PARAMETER', 'DOCUMENT', 'FLOOR', 'MANUAL');

-- CreateEnum
CREATE TYPE "AuditReminderKind" AS ENUM (
  'AUDIT_24H',
  'AUDIT_2H',
  'VISIT_24H',
  'VISIT_2H',
  'AUDIT_OVERDUE',
  'VISIT_OVERDUE'
);

-- CreateEnum
CREATE TYPE "AuditReminderEmailStatus" AS ENUM ('PENDING', 'SENT', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "AuditSchedule" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "programAuditId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "AuditScheduleStatus" NOT NULL DEFAULT 'DRAFT',
  "priority" "AuditPriority" NOT NULL DEFAULT 'MEDIUM',
  "mode" "AuditMode" NOT NULL DEFAULT 'ONSITE',
  "location" TEXT,
  "scheduledStartAt" TIMESTAMP(3) NOT NULL,
  "scheduledEndAt" TIMESTAMP(3),
  "ownerConsultantId" TEXT,
  "createdByAdminType" "AuditActorType" NOT NULL,
  "createdByConsultantId" TEXT,
  "createdByNameSnapshot" TEXT,
  "followUpAt" TIMESTAMP(3),
  "internalNotes" TEXT,
  "outcomeSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AuditSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditVisit" (
  "id" TEXT NOT NULL,
  "auditScheduleId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "purpose" TEXT,
  "plannedStartAt" TIMESTAMP(3) NOT NULL,
  "plannedEndAt" TIMESTAMP(3),
  "location" TEXT,
  "contactPerson" TEXT,
  "status" "AuditVisitStatus" NOT NULL DEFAULT 'PLANNED',
  "notes" TEXT,
  "outcome" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AuditVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditChecklistItem" (
  "id" TEXT NOT NULL,
  "auditScheduleId" TEXT NOT NULL,
  "visitId" TEXT,
  "source" "AuditChecklistSource" NOT NULL,
  "label" TEXT NOT NULL,
  "details" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AuditChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditAttachment" (
  "id" TEXT NOT NULL,
  "auditScheduleId" TEXT NOT NULL,
  "visitId" TEXT,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "uploadedByAdminType" "AuditActorType" NOT NULL,
  "uploadedByConsultantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditReminderNotice" (
  "id" TEXT NOT NULL,
  "auditScheduleId" TEXT NOT NULL,
  "visitId" TEXT,
  "kind" "AuditReminderKind" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "notifyAt" TIMESTAMP(3) NOT NULL,
  "emailTo" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "emailStatus" "AuditReminderEmailStatus" NOT NULL DEFAULT 'PENDING',
  "emailError" TEXT,
  "emailSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditReminderNotice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditSchedule_clientId_scheduledStartAt_idx" ON "AuditSchedule"("clientId", "scheduledStartAt");

-- CreateIndex
CREATE INDEX "AuditSchedule_status_scheduledStartAt_idx" ON "AuditSchedule"("status", "scheduledStartAt");

-- CreateIndex
CREATE INDEX "AuditSchedule_ownerConsultantId_scheduledStartAt_idx" ON "AuditSchedule"("ownerConsultantId", "scheduledStartAt");

-- CreateIndex
CREATE INDEX "AuditSchedule_programAuditId_idx" ON "AuditSchedule"("programAuditId");

-- CreateIndex
CREATE INDEX "AuditVisit_auditScheduleId_plannedStartAt_idx" ON "AuditVisit"("auditScheduleId", "plannedStartAt");

-- CreateIndex
CREATE INDEX "AuditVisit_status_plannedStartAt_idx" ON "AuditVisit"("status", "plannedStartAt");

-- CreateIndex
CREATE INDEX "AuditChecklistItem_auditScheduleId_sortOrder_idx" ON "AuditChecklistItem"("auditScheduleId", "sortOrder");

-- CreateIndex
CREATE INDEX "AuditChecklistItem_visitId_idx" ON "AuditChecklistItem"("visitId");

-- CreateIndex
CREATE INDEX "AuditChecklistItem_completed_idx" ON "AuditChecklistItem"("completed");

-- CreateIndex
CREATE INDEX "AuditAttachment_auditScheduleId_createdAt_idx" ON "AuditAttachment"("auditScheduleId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditAttachment_visitId_createdAt_idx" ON "AuditAttachment"("visitId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditReminderNotice_auditScheduleId_notifyAt_idx" ON "AuditReminderNotice"("auditScheduleId", "notifyAt");

-- CreateIndex
CREATE INDEX "AuditReminderNotice_visitId_notifyAt_idx" ON "AuditReminderNotice"("visitId", "notifyAt");

-- CreateIndex
CREATE INDEX "AuditReminderNotice_emailStatus_notifyAt_idx" ON "AuditReminderNotice"("emailStatus", "notifyAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuditReminderNotice_audit_kind_unique" ON "AuditReminderNotice"("auditScheduleId", "kind") WHERE "visitId" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AuditReminderNotice_visit_kind_unique" ON "AuditReminderNotice"("visitId", "kind") WHERE "visitId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "AuditSchedule" ADD CONSTRAINT "AuditSchedule_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditSchedule" ADD CONSTRAINT "AuditSchedule_programAuditId_fkey" FOREIGN KEY ("programAuditId") REFERENCES "ProgramAudit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditSchedule" ADD CONSTRAINT "AuditSchedule_ownerConsultantId_fkey" FOREIGN KEY ("ownerConsultantId") REFERENCES "Consultant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditSchedule" ADD CONSTRAINT "AuditSchedule_createdByConsultantId_fkey" FOREIGN KEY ("createdByConsultantId") REFERENCES "Consultant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditVisit" ADD CONSTRAINT "AuditVisit_auditScheduleId_fkey" FOREIGN KEY ("auditScheduleId") REFERENCES "AuditSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditChecklistItem" ADD CONSTRAINT "AuditChecklistItem_auditScheduleId_fkey" FOREIGN KEY ("auditScheduleId") REFERENCES "AuditSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditChecklistItem" ADD CONSTRAINT "AuditChecklistItem_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "AuditVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditAttachment" ADD CONSTRAINT "AuditAttachment_auditScheduleId_fkey" FOREIGN KEY ("auditScheduleId") REFERENCES "AuditSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditAttachment" ADD CONSTRAINT "AuditAttachment_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "AuditVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditAttachment" ADD CONSTRAINT "AuditAttachment_uploadedByConsultantId_fkey" FOREIGN KEY ("uploadedByConsultantId") REFERENCES "Consultant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditReminderNotice" ADD CONSTRAINT "AuditReminderNotice_auditScheduleId_fkey" FOREIGN KEY ("auditScheduleId") REFERENCES "AuditSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditReminderNotice" ADD CONSTRAINT "AuditReminderNotice_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "AuditVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
