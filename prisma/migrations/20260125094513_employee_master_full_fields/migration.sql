/*
  Warnings:

  - You are about to drop the column `address` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `employeeCode` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `joiningDate` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Employee` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "address",
DROP COLUMN "department",
DROP COLUMN "email",
DROP COLUMN "employeeCode",
DROP COLUMN "joiningDate",
DROP COLUMN "phone",
DROP COLUMN "status",
ADD COLUMN     "aadharNo" TEXT,
ADD COLUMN     "bankAcNo" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "currentDept" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "dob" TEXT,
ADD COLUMN     "doj" TEXT,
ADD COLUMN     "dor" TEXT,
ADD COLUMN     "drivingLicenceNo" TEXT,
ADD COLUMN     "educationQualification" TEXT,
ADD COLUMN     "elcIdNo" TEXT,
ADD COLUMN     "empNo" TEXT,
ADD COLUMN     "esicNo" TEXT,
ADD COLUMN     "experienceInRelevantField" TEXT,
ADD COLUMN     "fatherSpouseName" TEXT,
ADD COLUMN     "fileNo" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "ifscCode" TEXT,
ADD COLUMN     "maritalStatus" TEXT,
ADD COLUMN     "mobileNumber" TEXT,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "nominee1Age" TEXT,
ADD COLUMN     "nominee1BirthDate" TEXT,
ADD COLUMN     "nominee1Name" TEXT,
ADD COLUMN     "nominee1Proportion" TEXT,
ADD COLUMN     "nominee1Relation" TEXT,
ADD COLUMN     "nominee2Age" TEXT,
ADD COLUMN     "nominee2BirthDate" TEXT,
ADD COLUMN     "nominee2Name" TEXT,
ADD COLUMN     "nominee2Proportion" TEXT,
ADD COLUMN     "nominee2Relation" TEXT,
ADD COLUMN     "panNo" TEXT,
ADD COLUMN     "permanentAddress" TEXT,
ADD COLUMN     "pfNo" TEXT,
ADD COLUMN     "pinCode" TEXT,
ADD COLUMN     "postOffice" TEXT,
ADD COLUMN     "presentAddress" TEXT,
ADD COLUMN     "reasonForExit" TEXT,
ADD COLUMN     "religion" TEXT,
ADD COLUMN     "salaryWage" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "subDivision" TEXT,
ADD COLUMN     "surName" TEXT,
ADD COLUMN     "temporaryAddress" TEXT,
ADD COLUMN     "thana" TEXT,
ADD COLUMN     "typeOfEmployment" TEXT,
ADD COLUMN     "uanNo" TEXT,
ADD COLUMN     "village" TEXT,
ALTER COLUMN "fullName" DROP NOT NULL;
