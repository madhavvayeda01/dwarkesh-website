-- CreateTable
CREATE TABLE "PayrollRecord" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "employeeName" TEXT,
    "payDays" DOUBLE PRECISION NOT NULL,
    "otHoursTarget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayrollRecord_clientId_year_month_idx" ON "PayrollRecord"("clientId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRecord_clientId_year_month_employeeCode_key" ON "PayrollRecord"("clientId", "year", "month", "employeeCode");

-- AddForeignKey
ALTER TABLE "PayrollRecord" ADD CONSTRAINT "PayrollRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
