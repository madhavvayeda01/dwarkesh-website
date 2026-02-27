-- CreateEnum
CREATE TYPE "WeekendType" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN', 'ROTATIONAL');

-- CreateTable
CREATE TABLE "ClientShiftConfig" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "generalShiftStart" TIME(0) NOT NULL,
    "generalShiftEnd" TIME(0) NOT NULL,
    "shiftAStart" TIME(0) NOT NULL,
    "shiftAEnd" TIME(0) NOT NULL,
    "shiftBStart" TIME(0) NOT NULL,
    "shiftBEnd" TIME(0) NOT NULL,
    "shiftCStart" TIME(0) NOT NULL,
    "shiftCEnd" TIME(0) NOT NULL,
    "weekendType" "WeekendType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClientShiftConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientShiftConfig_clientId_key" ON "ClientShiftConfig"("clientId");

-- AddForeignKey
ALTER TABLE "ClientShiftConfig" ADD CONSTRAINT "ClientShiftConfig_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
