import Papa from "papaparse";
import * as XLSX from "xlsx";
import { fail, ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { normalizeEmployeeCode } from "@/lib/employee-code";

const HEADERS = [
  "Emp No",
  "Name",
  "Department",
  "Designation",
  "Rate of pay",
  "Present day",
  "Advance",
  "Account No.",
  "IFSC",
  "Bank Name",
];

type AdvanceRow = {
  id: string;
  empNo: string;
  name: string;
  department: string;
  designation: string;
  rateOfPay: number;
  presentDay: number;
  advance: number;
  accountNo: string;
  ifsc: string;
  bankName: string;
};

type ImportedAdvanceOverrides = {
  presentDay?: number;
  rateOfPay?: number;
  name?: string;
  department?: string;
  designation?: string;
  accountNo?: string;
  ifsc?: string;
  bankName?: string;
};

function toNumber(value: string | null | undefined, fallback = 0): number {
  if (!value) return fallback;
  const normalized = String(value).replace(/,/g, "").trim();
  if (!normalized) return fallback;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : fallback;
}

function toSafeNumber(value: unknown): number {
  const num = Number(String(value ?? "").replace(/,/g, "").trim());
  if (!Number.isFinite(num) || num < 0) return 0;
  return num;
}

function roundUp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.ceil(value);
}

function buildRows(employees: Array<{
  id: string;
  empNo: string | null;
  fullName: string | null;
  currentDept: string | null;
  designation: string | null;
  salaryWage: string | null;
  bankAcNo: string | null;
  ifscCode: string | null;
  bankName: string | null;
}>, importedByCode?: Map<string, ImportedAdvanceOverrides>): AdvanceRow[] {
  return employees.map((employee) => {
    const empNo = employee.empNo || "";
    const normalizedCode = normalizeEmployeeCode(empNo) || "";
    const imported = importedByCode?.get(normalizedCode);
    const presentDay = imported?.presentDay ?? 0;
    const rateOfPay = imported?.rateOfPay ?? toNumber(employee.salaryWage, 0);
    const advance = roundUp(rateOfPay * presentDay);
    return {
      id: employee.id,
      empNo,
      name: imported?.name || employee.fullName || "",
      department: imported?.department || employee.currentDept || "",
      designation: imported?.designation || employee.designation || "",
      rateOfPay,
      presentDay,
      advance,
      accountNo: imported?.accountNo || employee.bankAcNo || "",
      ifsc: imported?.ifsc || employee.ifscCode || "",
      bankName: imported?.bankName || employee.bankName || "",
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
        fullName: true,
        currentDept: true,
        designation: true,
        salaryWage: true,
        bankAcNo: true,
        ifscCode: true,
        bankName: true,
      },
    });

    const rows = buildRows(employees);
    const body = rows.map((row) => [
      row.empNo,
      row.name,
      row.department,
      row.designation,
      row.rateOfPay,
      row.presentDay,
      row.advance,
      row.accountNo,
      row.ifsc,
      row.bankName,
    ]);

    const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...body]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Advance Data");
    const bytes = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const fileName = `advance_data_${new Date().toISOString().slice(0, 10)}.xlsx`;

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
    const message = err instanceof Error ? err.message : "Failed to export advance data";
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

    const importedByCode = new Map<string, ImportedAdvanceOverrides>();
    for (const row of rows) {
      const codeCell =
        row["Emp No"] ??
        row["Emp NO."] ??
        row["Emp NO"] ??
        row["Employee Code"] ??
        row["empNo"];
      const presentDayCell =
        row["Present day"] ??
        row["Present Day"] ??
        row["presentDay"] ??
        row["Present"];
      const rateOfPayCell =
        row["Rate of pay"] ??
        row["Rate Of Pay"] ??
        row["rateOfPay"];

      const code = normalizeEmployeeCode(codeCell ? String(codeCell) : "");
      if (!code) continue;
      importedByCode.set(code, {
        name: String(row["Name"] ?? row["name"] ?? "").trim() || undefined,
        department:
          String(row["Department"] ?? row["department"] ?? "").trim() || undefined,
        designation:
          String(row["Designation"] ?? row["designation"] ?? "").trim() || undefined,
        rateOfPay:
          rateOfPayCell === undefined || rateOfPayCell === null || String(rateOfPayCell).trim() === ""
            ? undefined
            : toSafeNumber(rateOfPayCell),
        presentDay: toSafeNumber(presentDayCell),
        accountNo:
          String(row["Account No."] ?? row["Account No"] ?? row["accountNo"] ?? "").trim() ||
          undefined,
        ifsc: String(row["IFSC"] ?? row["ifsc"] ?? "").trim() || undefined,
        bankName:
          String(row["Bank Name"] ?? row["bankName"] ?? "").trim() || undefined,
      });
    }

    const employees = await prisma.employee.findMany({
      where: { clientId: session.clientId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        empNo: true,
        fullName: true,
        currentDept: true,
        designation: true,
        salaryWage: true,
        bankAcNo: true,
        ifscCode: true,
        bankName: true,
      },
    });

    const advanceRows = buildRows(employees, importedByCode);
    return ok("Advance data imported", { rows: advanceRows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to import advance data";
    return fail(message, 500);
  }
}
