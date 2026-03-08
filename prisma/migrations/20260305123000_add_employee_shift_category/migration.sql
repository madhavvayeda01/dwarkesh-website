-- CreateEnum
CREATE TYPE "EmployeeShiftCategory" AS ENUM ('STAFF', 'WORKER');

-- AlterTable
ALTER TABLE "Employee"
ADD COLUMN "shiftCategory" "EmployeeShiftCategory" NOT NULL DEFAULT 'WORKER';

-- Backfill from legacy employment type
UPDATE "Employee"
SET "shiftCategory" = 'STAFF'
WHERE LOWER(COALESCE("typeOfEmployment", '')) LIKE '%staff%';

-- CreateIndex
CREATE INDEX "Employee_clientId_shiftCategory_idx"
ON "Employee"("clientId", "shiftCategory");
