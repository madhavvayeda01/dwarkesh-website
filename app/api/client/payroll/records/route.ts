import { z } from "zod";
import * as XLSX from "xlsx";
import { fail, ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { normalizeEmployeeCode } from "@/lib/employee-code";
import { prisma } from "@/lib/prisma";
import {
  deleteObjectByPath,
  listSupabaseFilesByPrefix,
  uploadBufferToSupabase,
} from "@/lib/storage";

const rowSchema = z.object({
  srNo: z.number(),
  employeeId: z.string().trim().optional(),
  empCode: z.string().trim().min(1),
  uanNo: z.string(),
  esicNo: z.string(),
  employeeName: z.string(),
  department: z.string(),
  designation: z.string(),
  doj: z.string(),
  weeklyOff: z.string(),
  monthlyCapDays: z.number(),
  payDays: z.number(),
  basic: z.number(),
  hra: z.number(),
  total: z.number(),
  otAmount: z.number(),
  grandTotal: z.number(),
  pf: z.number(),
  esic: z.number(),
  profTax: z.number(),
  tds: z.number(),
  loan: z.number(),
  adv: z.number(),
  tea: z.number(),
  lwf: z.number(),
  totalDeduction: z.number(),
  netPayable: z.number(),
  signature: z.string(),
  bankAcNo: z.string(),
  ifscCode: z.string(),
  bankName: z.string(),
  totalFinal: z.number(),
  otHoursTarget: z.number().optional().default(0),
});

const generateSchema = z.object({
  month: z.number().int().min(0).max(11),
  year: z.number().int().min(2000).max(2100),
  rows: z.array(rowSchema).min(1),
});

const deleteSchema = z.object({
  fileName: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-zA-Z0-9._-]+$/, "Invalid file name"),
});

const HEADERS = [
  "Sr #",
  "Emp Code",
  "UAN Number",
  "ESIC Number",
  "Name Of Employee",
  "Depart.",
  "Desig.",
  "DOJ",
  "Weekly Off",
  "Cap Days (Y)",
  "Pay Days",
  "Basic",
  "HRA",
  "TOTAL",
  "OT Amount",
  "GRAND TOTAL",
  "PF",
  "ESIC",
  "Prof Tax",
  "TDS",
  "Loan",
  "Adv",
  "Tea",
  "LWF",
  "Total Deduction",
  "Net Payable",
  "SIGNATURE",
  "A/C NO.",
  "IFSC CODE",
  "BANK NAME",
  "TOTAL",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export async function GET() {
  const { error, session } = await requireClientModule("payroll");
  if (error || !session) return error;
  if (!session.clientId) return fail("Unauthorized", 401);

  const prefix = `payroll-generated/${session.clientId}/`;
  const listed = await listSupabaseFilesByPrefix(prefix);
  if (!listed.ok) return fail(listed.error, 500);

  return ok("Payroll records fetched", { files: listed.files });
}

export async function POST(req: Request) {
  const { error, session } = await requireClientModule("payroll");
  if (error || !session) return error;
  if (!session.clientId) return fail("Unauthorized", 401);

  const parsed = generateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail("Invalid payroll payload", 400, parsed.error.flatten());
  }

  const clientId = session.clientId;
  const monthLabel = MONTHS[parsed.data.month];
  const rows = parsed.data.rows.map((row) => [
    row.srNo,
    row.empCode,
    row.uanNo,
    row.esicNo,
    row.employeeName,
    row.department,
    row.designation,
    row.doj,
    row.weeklyOff,
    row.monthlyCapDays,
    row.payDays,
    row.basic,
    row.hra,
    row.total,
    row.otAmount,
    row.grandTotal,
    row.pf,
    row.esic,
    row.profTax,
    row.tds,
    row.loan,
    row.adv,
    row.tea,
    row.lwf,
    row.totalDeduction,
    row.netPayable,
    row.signature,
    row.bankAcNo,
    row.ifscCode,
    row.bankName,
    row.totalFinal,
  ]);

  const sheetData = [
    [`Payroll: ${monthLabel} ${parsed.data.year}`],
    [],
    HEADERS,
    ...rows,
  ];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  const textCols = ["C", "D", "AB"];
  for (let r = 4; r <= sheetData.length; r += 1) {
    for (const col of textCols) {
      const addr = `${col}${r}`;
      const cell = ws[addr];
      if (!cell) continue;
      cell.t = "s";
      cell.v = String(cell.v ?? "");
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Payroll Final");
  const bytes = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const safeMonth = monthLabel.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `payroll_${safeMonth}_${parsed.data.year}_${Date.now()}.xlsx`;
  const objectPath = `payroll-generated/${clientId}/${fileName}`;
  const uploaded = await uploadBufferToSupabase(
    bytes,
    objectPath,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  if (!uploaded.ok) return fail(uploaded.error, 500);

  const employees = await prisma.employee.findMany({
    where: { clientId, employmentStatus: "ACTIVE" },
    select: { id: true, empNo: true },
  });
  const employeeByCode = new Map<string, string>();
  const activeEmployeeIds = new Set<string>();
  for (const employee of employees) {
    activeEmployeeIds.add(employee.id);
    const key = normalizeEmployeeCode(employee.empNo);
    if (key && !employeeByCode.has(key)) employeeByCode.set(key, employee.id);
  }

  const dedupedPayrollByCode = new Map<
    string,
    {
      clientId: string;
      employeeId: string | null;
      month: number;
      year: number;
      employeeCode: string;
      employeeName: string | null;
      payDays: number;
      otHoursTarget: number;
    }
  >();
  for (const row of parsed.data.rows) {
    const normalizedEmployeeId = (row.employeeId || "").trim();
    const normalizedCode =
      normalizeEmployeeCode(row.empCode) ||
      normalizeEmployeeCode(normalizedEmployeeId);
    if (!normalizedCode) continue;
    const resolvedEmployeeId =
      (normalizedEmployeeId && activeEmployeeIds.has(normalizedEmployeeId)
        ? normalizedEmployeeId
        : null) ||
      employeeByCode.get(normalizedCode) ||
      null;
    const dedupeKey = resolvedEmployeeId || normalizedCode;
    dedupedPayrollByCode.set(dedupeKey, {
      clientId,
      employeeId: resolvedEmployeeId,
      month: parsed.data.month + 1,
      year: parsed.data.year,
      employeeCode: normalizedCode,
      employeeName: row.employeeName?.trim() || null,
      payDays: row.payDays,
      otHoursTarget: row.otHoursTarget ?? 0,
    });
  }

  const payrollRows = Array.from(dedupedPayrollByCode.values());
  if (payrollRows.length === 0) {
    return fail("Payroll rows could not be mapped to employees. Check employee codes.", 400);
  }

  await prisma.payrollRecord.deleteMany({
    where: {
      clientId,
      month: parsed.data.month + 1,
      year: parsed.data.year,
    },
  });
  if (payrollRows.length > 0) {
    await prisma.payrollRecord.createMany({
      data: payrollRows,
    });
  }

  return ok("Payroll generated and saved", {
    fileName,
    fileUrl: uploaded.fileUrl,
    month: monthLabel,
    year: parsed.data.year,
  });
}

export async function DELETE(req: Request) {
  const { error, session } = await requireClientModule("payroll");
  if (error || !session) return error;
  if (!session.clientId) return fail("Unauthorized", 401);

  const parsed = deleteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail("Invalid delete payload", 400, parsed.error.flatten());
  }

  const objectPath = `payroll-generated/${session.clientId}/${parsed.data.fileName}`;
  const deleted = await deleteObjectByPath(objectPath);
  if (!deleted.ok) return fail(deleted.error, 500);

  return ok("Payroll file deleted", { fileName: parsed.data.fileName });
}
