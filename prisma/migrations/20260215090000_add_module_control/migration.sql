-- CreateTable
CREATE TABLE "ModuleControl" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "employeesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "payrollEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inOutEnabled" BOOLEAN NOT NULL DEFAULT true,
    "trainingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "committeesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "documentsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "auditEnabled" BOOLEAN NOT NULL DEFAULT true,
    "chatEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleControl_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModuleControl_clientId_key" ON "ModuleControl"("clientId");

-- AddForeignKey
ALTER TABLE "ModuleControl" ADD CONSTRAINT "ModuleControl_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
