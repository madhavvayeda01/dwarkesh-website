import { z } from "zod";
import * as XLSX from "xlsx";
import { fail, ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import {
  deleteObjectByPath,
  listSupabaseFilesByPrefix,
  uploadBufferToSupabase,
} from "@/lib/storage";

const rowSchema = z.object({
  empNo: z.string(),
  name: z.string(),
  department: z.string(),
  designation: z.string(),
  rateOfPay: z.number(),
  presentDay: z.number(),
  advance: z.number(),
  accountNo: z.string(),
  ifsc: z.string(),
  bankName: z.string(),
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

export async function GET() {
  const { error, session } = await requireClientModule("payroll");
  if (error || !session) return error;
  if (!session.clientId) return fail("Unauthorized", 401);
  const clientId = session.clientId;

  const prefix = `advance-generated/${clientId}/`;
  const listed = await listSupabaseFilesByPrefix(prefix);
  if (!listed.ok) return fail(listed.error, 500);
  return ok("Advance records fetched", { files: listed.files });
}

export async function POST(req: Request) {
  const { error, session } = await requireClientModule("payroll");
  if (error || !session) return error;
  if (!session.clientId) return fail("Unauthorized", 401);
  const clientId = session.clientId;

  const parsed = generateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail("Invalid advance payload", 400, parsed.error.flatten());
  }

  const monthLabel = MONTHS[parsed.data.month];
  const rows = parsed.data.rows.map((row) => [
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

  const sheetData = [[`Advance: ${monthLabel} ${parsed.data.year}`], [], HEADERS, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Advance");
  const bytes = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const safeMonth = monthLabel.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `advance_${safeMonth}_${parsed.data.year}_${Date.now()}.xlsx`;
  const objectPath = `advance-generated/${clientId}/${fileName}`;
  const uploaded = await uploadBufferToSupabase(
    bytes,
    objectPath,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  if (!uploaded.ok) return fail(uploaded.error, 500);

  return ok("Advance generated and saved", {
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
  const clientId = session.clientId;

  const parsed = deleteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail("Invalid delete payload", 400, parsed.error.flatten());
  }

  const objectPath = `advance-generated/${clientId}/${parsed.data.fileName}`;
  const deleted = await deleteObjectByPath(objectPath);
  if (!deleted.ok) return fail(deleted.error, 500);

  return ok("Advance file deleted", { fileName: parsed.data.fileName });
}

