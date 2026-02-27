ALTER TABLE "PayrollRecord"
ADD COLUMN "employeeId" TEXT;

UPDATE "PayrollRecord" p
SET "employeeId" = e."id"
FROM "Employee" e
WHERE p."clientId" = e."clientId"
  AND UPPER(REGEXP_REPLACE(TRIM(COALESCE(p."employeeCode", '')), '^0+', '')) =
      UPPER(REGEXP_REPLACE(TRIM(COALESCE(e."empNo", '')), '^0+', ''));

CREATE INDEX "PayrollRecord_clientId_year_month_employeeId_idx"
ON "PayrollRecord"("clientId", "year", "month", "employeeId");

ALTER TABLE "PayrollRecord"
ADD CONSTRAINT "PayrollRecord_employeeId_fkey"
FOREIGN KEY ("employeeId") REFERENCES "Employee"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
