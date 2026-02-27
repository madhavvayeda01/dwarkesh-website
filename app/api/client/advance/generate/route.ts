import { z } from "zod";
import * as XLSX from "xlsx";
import { fail } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";

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
  rows: z.array(rowSchema),
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

function roundUp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.ceil(value);
}

export async function POST(req: Request) {
  const { error, session } = await requireClientModule("payroll");
  if (error || !session) return error;
  if (!session.clientId) return fail("Unauthorized", 401);

  const parsed = generateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail("Invalid advance payload", 400, parsed.error.flatten());
  }

  try {
    const monthLabel = MONTHS[parsed.data.month];
    const rows = parsed.data.rows.map((row) => [
      row.empNo,
      row.name,
      row.department,
      row.designation,
      row.rateOfPay,
      row.presentDay,
      roundUp(row.advance),
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
    const message = err instanceof Error ? err.message : "Failed to generate advance file";
    return fail(message, 500);
  }
}
