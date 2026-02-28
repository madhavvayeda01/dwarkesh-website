-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "Employee"
ADD COLUMN "employmentStatus" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "Employee_clientId_employmentStatus_idx" ON "Employee"("clientId", "employmentStatus");
