-- CreateTable
CREATE TABLE "AuditParameterOption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditParameterOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditDocumentOption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditDocumentOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditFloorOption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditFloorOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramAudit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parameterOptionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documentOptionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "floorOptionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuditParameterOption_name_key" ON "AuditParameterOption"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AuditDocumentOption_name_key" ON "AuditDocumentOption"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AuditFloorOption_name_key" ON "AuditFloorOption"("name");

-- CreateIndex
CREATE INDEX "ProgramAudit_name_idx" ON "ProgramAudit"("name");
