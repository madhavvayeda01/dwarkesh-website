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

function normalizeUan(value: unknown): string {
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

    const lines = rows
      .map((row) => {
        const uan = normalizeUan(row["UAN Number"]);
        const memberName = String(row["Name Of Employee"] ?? "").trim();
        if (!uan || !memberName) return null;

        const payDays = toSafeNumber(row["Pay Days"]);
        const basic = toSafeNumber(row["Basic"]);
        const gross = toSafeNumber(row["GRAND TOTAL"]);
        const pf = toSafeNumber(row["PF"]);

        const epfWages = pf > 0 ? Math.round(pf / 0.12) : Math.round(basic);
        const epsWages = Math.min(epfWages, 15000);
        const edliWages = epfWages;
        const ncpDays = Math.max(0, Math.round(26 - payDays));
        const refundAdv = 0;

        return [
          uan,
          memberName,
          Math.round(gross),
          Math.round(epfWages),
          Math.round(epsWages),
          Math.round(edliWages),
          ncpDays,
          refundAdv,
        ].join("#~#");
      })
      .filter((line): line is string => Boolean(line));

    if (lines.length === 0) {
      return fail("No valid rows found to generate PF file", 400);
    }

    const content = lines.join("\n");
    const outputName = `pf_ecr_${safeMonth}_${parsed.data.year}.txt`;
    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${outputName}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate PF file";
    return fail(message, 500);
  }
}

