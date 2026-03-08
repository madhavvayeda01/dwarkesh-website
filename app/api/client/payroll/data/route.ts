import Papa from "papaparse";
import * as XLSX from "xlsx";
import { WeekendType } from "@prisma/client";
import { z } from "zod";
import { loadAdvanceSource } from "@/lib/advance-source";
import { fail, ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { normalizeEmployeeCode } from "@/lib/employee-code";
import { resolvePayrollMasterWeeklyOffAndCap, weekdayName } from "@/lib/payroll-master";
import { prisma } from "@/lib/prisma";

type PayrollMasterDataRow = {
  id: string;
  srNo: number;
  employmentStatus: "ACTIVE" | "INACTIVE";
  uanNo: string;
  esicNo: string;
  empNo: string;
  status: string;
  employeeName: string;
  department: string;
  designation: string;
  doj: string;
  bankAcNo: string;
  ifscCode: string;
  bankName: string;
  actualRateOfPay: number;
  skillCategory: 1 | 2 | 3;
  actualWorkingDays: number;
  monthlyCapDaysY: number;
  weeklyOffDay: number;
  weeklyOffLabel: string;
  otherBenefit: number;
  tds: number;
  loan: number;
  adv: number;
  tea: number;
  lwf: number;
};

type PayrollMasterImportIssue = {
  type:
    | "missing_code"
    | "duplicate_code"
    | "unknown_code"
    | "invalid_number"
    | "invalid_skill_category";
  rowNumber: number;
  code?: string;
  field?: string;
  rawValue?: string;
  message: string;
};

type PayrollMasterImportReport = {
  fileName: string;
  parsedRows: number;
  importedRowsWithCode: number;
  uniqueCodes: number;
  matchedEmployeeCodes: number;
  unknownCodesCount: number;
  unknownCodes: string[];
  duplicateCodeRows: number;
  missingCodeRows: number;
  invalidNumberCorrections: number;
  invalidSkillCategoryCorrections: number;
  employeesWithoutImportedData: number;
  issues: PayrollMasterImportIssue[];
  issueTruncated: boolean;
};

const querySchema = z.object({
  month: z.coerce.number().int().min(0).max(11),
  year: z.coerce.number().int().min(2000).max(2100),
});

const HEADERS: string[] = [
  "Emp Code",
  "Name Of Employee",
  "Depart.",
  "Desig.",
  "DOJ",
  "UAN Number",
  "ESIC Number",
  "A/C NO.",
  "IFSC CODE",
  "BANK NAME",
  "Actual Rate",
  "Skill Category",
  "Working Days",
  "Week Off",
  "Cap Days (Y)",
  "Other Benefit",
  "TDS",
  "Loan",
  "Adv",
  "Tea",
  "LWF",
];

function toNumber(value: string | null | undefined, fallback = 0): number {
  if (!value) return fallback;
  const normalized = String(value).replace(/,/g, "").trim();
  if (!normalized) return fallback;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : fallback;
}

function parseNumberField(
  value: unknown,
  rowNumber: number,
  code: string,
  field: string,
  report: {
    issues: PayrollMasterImportIssue[];
    invalidNumberCorrections: number;
  }
) {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const normalized = raw.replace(/,/g, "");
  const num = Number(normalized);
  if (Number.isFinite(num)) return num;
  report.invalidNumberCorrections += 1;
  report.issues.push({
    type: "invalid_number",
    rowNumber,
    code,
    field,
    rawValue: raw,
    message: `${field} is invalid and was replaced with 0`,
  });
  return 0;
}

function parseSkillCategoryField(
  value: unknown,
  rowNumber: number,
  code: string,
  report: {
    issues: PayrollMasterImportIssue[];
    invalidSkillCategoryCorrections: number;
  }
): 1 | 2 | 3 {
  const raw = String(value ?? "").trim();
  if (!raw) return 3;
  const n = Number(raw);
  if (n === 1 || n === 2 || n === 3) return n;
  report.invalidSkillCategoryCorrections += 1;
  report.issues.push({
    type: "invalid_skill_category",
    rowNumber,
    code,
    field: "Skill Category",
    rawValue: raw,
    message: "Skill Category is invalid and was replaced with 3",
  });
  return 3;
}

function buildRows(
  employees: Array<{
    id: string;
    empNo: string | null;
    employmentStatus: "ACTIVE" | "INACTIVE";
    uanNo: string | null;
    esicNo: string | null;
    fullName: string | null;
    currentDept: string | null;
    designation: string | null;
    doj: string | null;
    salaryWage: string | null;
    bankAcNo: string | null;
    ifscCode: string | null;
    bankName: string | null;
  }>,
  inputByCode: Map<
    string,
    {
      actualRateOfPay: number;
      skillCategory: 1 | 2 | 3;
      actualWorkingDays: number;
      otherBenefit: number;
      tds: number;
      loan: number;
      tea: number;
      lwf: number;
    }
  >,
  month: number,
  year: number,
  clientId: string,
  weekendType: WeekendType,
  advanceAmounts: Map<string, number>
): PayrollMasterDataRow[] {
  return employees.map((employee, index) => {
    const empNo = employee.empNo || "";
    const code = normalizeEmployeeCode(empNo) || "";
    const imported = inputByCode.get(code);
    const resolved = resolvePayrollMasterWeeklyOffAndCap({
      clientId,
      employeeId: employee.id,
      year,
      monthIndex: month,
      weekendType,
    });

    return {
      id: employee.id,
      srNo: index + 1,
      employmentStatus: employee.employmentStatus,
      uanNo: employee.uanNo || "",
      esicNo: employee.esicNo || "",
      empNo,
      status: employee.employmentStatus,
      employeeName: employee.fullName || "",
      department: employee.currentDept || "",
      designation: employee.designation || "",
      doj: employee.doj || "",
      bankAcNo: employee.bankAcNo || "",
      ifscCode: employee.ifscCode || "",
      bankName: employee.bankName || "",
      actualRateOfPay: imported?.actualRateOfPay ?? toNumber(employee.salaryWage, 0),
      skillCategory: imported?.skillCategory ?? 3,
      actualWorkingDays: imported?.actualWorkingDays ?? 0,
      monthlyCapDaysY: resolved.monthlyCapDaysY,
      weeklyOffDay: resolved.weeklyOffDay,
      weeklyOffLabel: weekdayName(resolved.weeklyOffDay),
      otherBenefit: imported?.otherBenefit ?? 0,
      tds: imported?.tds ?? 0,
      loan: imported?.loan ?? 0,
      adv: code ? advanceAmounts.get(code) ?? 0 : 0,
      tea: imported?.tea ?? 0,
      lwf: imported?.lwf ?? 0,
    };
  });
}

export async function GET(req: Request) {
  const { error, session } = await requireClientModule("payroll");
  if (error || !session) return error;
  if (!session.clientId) return fail("Unauthorized", 401);

  const parsedQuery = querySchema.safeParse({
    month: new URL(req.url).searchParams.get("month"),
    year: new URL(req.url).searchParams.get("year"),
  });
  if (!parsedQuery.success) {
    return fail("Invalid query", 400, parsedQuery.error.flatten());
  }

  const { month, year } = parsedQuery.data;
  const clientId = session.clientId;

  try {
    const [employees, shiftConfig, advanceSource] = await Promise.all([
      prisma.employee.findMany({
        where: { clientId, employmentStatus: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          empNo: true,
          employmentStatus: true,
          uanNo: true,
          esicNo: true,
          fullName: true,
          currentDept: true,
          designation: true,
          doj: true,
          salaryWage: true,
          bankAcNo: true,
          ifscCode: true,
          bankName: true,
        },
      }),
      prisma.clientShiftConfig.findUnique({
        where: { clientId },
        select: { weekendType: true },
      }),
      loadAdvanceSource(clientId, month, year),
    ]);

    const weekendType: WeekendType = shiftConfig?.weekendType ?? "SUN";
    const rows = buildRows(
      employees,
      new Map(),
      month,
      year,
      clientId,
      weekendType,
      advanceSource.amountsByCode
    );
    const body = rows.map((row) => [
      row.empNo,
      row.employeeName,
      row.department,
      row.designation,
      row.doj,
      row.uanNo,
      row.esicNo,
      row.bankAcNo,
      row.ifscCode,
      row.bankName,
      row.actualRateOfPay,
      row.skillCategory,
      row.actualWorkingDays,
      row.weeklyOffLabel,
      row.monthlyCapDaysY,
      row.otherBenefit,
      row.tds,
      row.loan,
      row.adv,
      row.tea,
      row.lwf,
    ]);

    const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...body]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll Data");
    const bytes = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const fileName = `payroll_data_${new Date().toISOString().slice(0, 10)}.xlsx`;

    const binary = Uint8Array.from(bytes);
    return new Response(binary, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to export payroll data";
    return fail(message, 500);
  }
}

export async function POST(req: Request) {
  const { error, session } = await requireClientModule("payroll");
  if (error || !session) return error;
  if (!session.clientId) return fail("Unauthorized", 401);

  const clientId = session.clientId;

  const parsedQuery = querySchema.safeParse({
    month: new URL(req.url).searchParams.get("month"),
    year: new URL(req.url).searchParams.get("year"),
  });
  if (!parsedQuery.success) {
    return fail("Invalid query", 400, parsedQuery.error.flatten());
  }

  const { month, year } = parsedQuery.data;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return fail("File is required", 400);

    const fileName = file.name.toLowerCase();
    let rows: Record<string, unknown>[] = [];

    if (fileName.endsWith(".csv")) {
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (parsed.errors?.length) return fail(parsed.errors[0].message, 400);
      rows = (parsed.data as Record<string, unknown>[]) || [];
    } else if (fileName.endsWith(".xlsx")) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: "",
      }) as Record<string, unknown>[];
    } else {
      return fail("Only CSV or XLSX allowed", 400);
    }

    const inputByCode = new Map<
      string,
      {
        actualRateOfPay: number;
        skillCategory: 1 | 2 | 3;
        actualWorkingDays: number;
        otherBenefit: number;
        tds: number;
        loan: number;
        tea: number;
        lwf: number;
      }
    >();

    const importStats = {
      importedRowsWithCode: 0,
      duplicateCodeRows: 0,
      missingCodeRows: 0,
      invalidNumberCorrections: 0,
      invalidSkillCategoryCorrections: 0,
      issues: [] as PayrollMasterImportIssue[],
    };
    const seenCodes = new Set<string>();

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2;
      const codeCell =
        row["Emp Code"] ??
        row["Employee Code"] ??
        row["Emp NO."] ??
        row["Emp No"] ??
        row["empNo"];
      const code = normalizeEmployeeCode(codeCell ? String(codeCell) : "");
      if (!code) {
        importStats.missingCodeRows += 1;
        importStats.issues.push({
          type: "missing_code",
          rowNumber,
          message: "Employee code is missing, row skipped",
        });
        continue;
      }

      importStats.importedRowsWithCode += 1;
      if (seenCodes.has(code)) {
        importStats.duplicateCodeRows += 1;
        importStats.issues.push({
          type: "duplicate_code",
          rowNumber,
          code,
          message: "Duplicate employee code found, latest row value is used",
        });
      }
      seenCodes.add(code);

      inputByCode.set(code, {
        actualRateOfPay: parseNumberField(
          row["Actual Rate"] ?? row["actualRateOfPay"],
          rowNumber,
          code,
          "Actual Rate",
          importStats
        ),
        skillCategory: parseSkillCategoryField(
          row["Skill Category"] ?? row["skillCategory"],
          rowNumber,
          code,
          importStats
        ),
        actualWorkingDays: parseNumberField(
          row["Working Days"] ?? row["actualWorkingDays"],
          rowNumber,
          code,
          "Working Days",
          importStats
        ),
        otherBenefit: parseNumberField(
          row["Other Benefit"] ?? row["otherBenefit"],
          rowNumber,
          code,
          "Other Benefit",
          importStats
        ),
        tds: parseNumberField(row["TDS"] ?? row["tds"], rowNumber, code, "TDS", importStats),
        loan: parseNumberField(
          row["Loan"] ?? row["loan"],
          rowNumber,
          code,
          "Loan",
          importStats
        ),
        tea: parseNumberField(row["Tea"] ?? row["tea"], rowNumber, code, "Tea", importStats),
        lwf: parseNumberField(row["LWF"] ?? row["lwf"], rowNumber, code, "LWF", importStats),
      });
    }

    const [employees, shiftConfig, advanceSource] = await Promise.all([
      prisma.employee.findMany({
        where: { clientId, employmentStatus: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          empNo: true,
          employmentStatus: true,
          uanNo: true,
          esicNo: true,
          fullName: true,
          currentDept: true,
          designation: true,
          doj: true,
          salaryWage: true,
          bankAcNo: true,
          ifscCode: true,
          bankName: true,
        },
      }),
      prisma.clientShiftConfig.findUnique({
        where: { clientId },
        select: { weekendType: true },
      }),
      loadAdvanceSource(clientId, month, year),
    ]);

    const weekendType: WeekendType = shiftConfig?.weekendType ?? "SUN";
    const payrollRows = buildRows(
      employees,
      inputByCode,
      month,
      year,
      clientId,
      weekendType,
      advanceSource.amountsByCode
    );

    const employeeCodeSet = new Set(
      employees
        .map((employee) => normalizeEmployeeCode(employee.empNo))
        .filter((code): code is string => Boolean(code))
    );
    const importedCodes = Array.from(inputByCode.keys());
    const unknownCodes = importedCodes.filter((code) => !employeeCodeSet.has(code));
    for (const code of unknownCodes) {
      importStats.issues.push({
        type: "unknown_code",
        rowNumber: 0,
        code,
        message: "Imported code is not found in active employee master",
      });
    }

    const matchedEmployeeCodes = importedCodes.length - unknownCodes.length;
    const employeesWithoutImportedData = employees.filter((employee) => {
      const code = normalizeEmployeeCode(employee.empNo);
      if (!code) return true;
      return !inputByCode.has(code);
    }).length;

    const issueLimit = 200;
    const report: PayrollMasterImportReport = {
      fileName: file.name,
      parsedRows: rows.length,
      importedRowsWithCode: importStats.importedRowsWithCode,
      uniqueCodes: importedCodes.length,
      matchedEmployeeCodes,
      unknownCodesCount: unknownCodes.length,
      unknownCodes: unknownCodes.slice(0, 100),
      duplicateCodeRows: importStats.duplicateCodeRows,
      missingCodeRows: importStats.missingCodeRows,
      invalidNumberCorrections: importStats.invalidNumberCorrections,
      invalidSkillCategoryCorrections: importStats.invalidSkillCategoryCorrections,
      employeesWithoutImportedData,
      issues: importStats.issues.slice(0, issueLimit),
      issueTruncated: importStats.issues.length > issueLimit,
    };

    return ok("Payroll data imported", { rows: payrollRows, report });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to import payroll data";
    return fail(message, 500);
  }
}
