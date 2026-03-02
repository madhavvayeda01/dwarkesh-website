-- CreateEnum
CREATE TYPE "EmployeeFileStatus" AS ENUM ('PENDING', 'CREATED');

-- CreateEnum
CREATE TYPE "ComplianceDocumentStatus" AS ENUM ('ACTIVE', 'NOT_APPLICABLE', 'NOT_AVAILABLE');

-- AlterTable
ALTER TABLE "ComplianceLegalDocument" ADD COLUMN     "documentStatus" "ComplianceDocumentStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "expiryDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "employeeFileStatus" "EmployeeFileStatus" NOT NULL DEFAULT 'PENDING';
