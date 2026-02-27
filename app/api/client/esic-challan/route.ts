import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { z } from "zod";
import { fail } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { listSupabaseFilesByPrefix } from "@/lib/storage";

const requestSchema = z.object({
  month: z.number().int().min(0).max(11),
  year: z.number().int().min(2000).max(2100),
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

function toSafeNumber(value: unknown): number {
  const num = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(num) ? num : 0;
}

function normalizeEsicNo(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

async function readFileBytes(fileUrl: string): Promise<Uint8Array> {
  if (/^https?:\/\//i.test(fileUrl)) {
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error("Failed to read payroll file from storage");
    return new Uint8Array(await res.arrayBuffer());
  }

  const normalized = fileUrl.replace(/^\/+/, "");
  const absolute = path.join(process.cwd(), "public", normalized);
  return new Uint8Array(await fs.readFile(absolute));
}

export async function POST(req: Request) {
  const { error, session } = await requireClientModule("payroll");
  if (error || !session) return error;
  if (!session.clientId) return fail("Unauthorized", 401);
  const clientId = session.clientId;

  const parsed = requestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail("Invalid request payload", 400, parsed.error.flatten());
  }

  const monthLabel = MONTHS[parsed.data.month];
  const safeMonth = monthLabel.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filePrefix = `payroll_${safeMonth}_${parsed.data.year}_`;

  const listed = await listSupabaseFilesByPrefix(`payroll-generated/${clientId}/`);
  if (!listed.ok) return fail(listed.error, 500);

  const payrollFile = listed.files.find((file) => file.name.startsWith(filePrefix));
  if (!payrollFile) {
    return fail(`No payroll data found for ${monthLabel} ${parsed.data.year}`, 404);
  }

  try {
    const bytes = await readFileBytes(payrollFile.fileUrl);
    const workbook = XLSX.read(bytes, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      range: 2,
    }) as Record<string, unknown>[];

    // ESIC upload-friendly CSV:
    // IP Number,IP Name,No of Days,Total Monthly Wages,Reason Code
    const header = "IP Number,IP Name,No of Days,Total Monthly Wages,Reason Code";
    const lines = rows
      .map((row) => {
        const ipNumber = normalizeEsicNo(row["ESIC Number"]);
        const ipName = String(row["Name Of Employee"] ?? "").trim().replace(/"/g, '""');
        if (!ipNumber || !ipName) return null;

        const days = Math.max(0, Math.round(toSafeNumber(row["Pay Days"])));
        const wages = Math.max(0, Math.round(toSafeNumber(row["GRAND TOTAL"])));
        const reasonCode = 0;

        return `${ipNumber},"${ipName}",${days},${wages},${reasonCode}`;
      })
      .filter((line): line is string => Boolean(line));

    if (lines.length === 0) {
      return fail("No valid rows found to generate ESIC file", 400);
    }

    const content = [header, ...lines].join("\n");
    const outputName = `esic_upload_${safeMonth}_${parsed.data.year}.csv`;
    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${outputName}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate ESIC file";
    return fail(message, 500);
  }
}

