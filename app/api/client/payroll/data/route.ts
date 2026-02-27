import Papa from "papaparse";
import * as XLSX from "xlsx";
import { fail, ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { normalizeEmployeeCode } from "@/lib/employee-code";

type PayrollDataRow = {
  id: string;
  srNo: number;
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
  otherBenefit: number;
  tds: number;
  loan: number;
  adv: number;
  tea: number;
  lwf: number;
};

const HEADERS = [
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

function toSafeNumber(value: unknown): number {
  const num = Number(String(value ?? "").replace(/,/g, "").trim());
  if (!Number.isFinite(num)) return 0;
  return num;
}

function toSkillCategory(value: unknown): 1 | 2 | 3 {
  const n = Number(String(value ?? "").trim());
  if (n === 1 || n === 2 || n === 3) return n;
  return 3;
}

function buildRows(
  employees: Array<{
    id: string;
    empNo: string | null;
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
  inputByCode?: Map<
    string,
    {
      actualRateOfPay: number;
      skillCategory: 1 | 2 | 3;
      actualWorkingDays: number;
      otherBenefit: number;
      tds: number;
      loan: number;
      adv: number;
      tea: number;
      lwf: number;
    }
  >
): PayrollDataRow[] {
  return employees.map((employee, index) => {
    const empNo = employee.empNo || "";
    const code = normalizeEmployeeCode(empNo) || "";
    const imported = inputByCode?.get(code);
    return {
      id: employee.id,
      srNo: index + 1,
      uanNo: employee.uanNo || "",
      esicNo: employee.esicNo || "",
      empNo,
      status: "",
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
      otherBenefit: imported?.otherBenefit ?? 0,
      tds: imported?.tds ?? 0,
      loan: imported?.loan ?? 0,
      adv: imported?.adv ?? 0,
      tea: imported?.tea ?? 0,
      lwf: imported?.lwf ?? 0,
    };
  });
}

export async function GET() {
  const { error, session } = await requireClientModule("payroll");
  if (error || !session) return error;
  if (!session.clientId) return fail("Unauthorized", 401);

  try {
    const employees = await prisma.employee.findMany({
      where: { clientId: session.clientId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        empNo: true,
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
    });

    const rows = buildRows(employees);
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
        adv: number;
        tea: number;
        lwf: number;
      }
    >();

    for (const row of rows) {
      const codeCell =
        row["Emp Code"] ??
        row["Employee Code"] ??
        row["Emp NO."] ??
        row["Emp No"] ??
        row["empNo"];
      const code = normalizeEmployeeCode(codeCell ? String(codeCell) : "");
      if (!code) continue;

      inputByCode.set(code, {
        actualRateOfPay: toSafeNumber(row["Actual Rate"] ?? row["actualRateOfPay"]),
        skillCategory: toSkillCategory(row["Skill Category"] ?? row["skillCategory"]),
        actualWorkingDays: toSafeNumber(row["Working Days"] ?? row["actualWorkingDays"]),
        otherBenefit: toSafeNumber(row["Other Benefit"] ?? row["otherBenefit"]),
        tds: toSafeNumber(row["TDS"] ?? row["tds"]),
        loan: toSafeNumber(row["Loan"] ?? row["loan"]),
        adv: toSafeNumber(row["Adv"] ?? row["adv"]),
        tea: toSafeNumber(row["Tea"] ?? row["tea"]),
        lwf: toSafeNumber(row["LWF"] ?? row["lwf"]),
      });
    }

    const employees = await prisma.employee.findMany({
      where: { clientId: session.clientId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        empNo: true,
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
    });

    const payrollRows = buildRows(employees, inputByCode);
    return ok("Payroll data imported", { rows: payrollRows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to import payroll data";
    return fail(message, 500);
  }
}
