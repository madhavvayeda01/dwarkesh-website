-- CreateTable
CREATE TABLE "ClientHoliday" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClientHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientHoliday_clientId_date_key" ON "ClientHoliday"("clientId", "date");

-- CreateIndex
CREATE INDEX "ClientHoliday_year_idx" ON "ClientHoliday"("year");

-- CreateIndex
CREATE INDEX "ClientHoliday_clientId_year_idx" ON "ClientHoliday"("clientId", "year");

-- AddForeignKey
ALTER TABLE "ClientHoliday" ADD CONSTRAINT "ClientHoliday_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
