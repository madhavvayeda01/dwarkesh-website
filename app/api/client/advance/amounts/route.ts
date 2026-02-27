import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { listSupabaseFilesByPrefix } from "@/lib/storage";
import { normalizeEmployeeCode } from "@/lib/employee-code";

const querySchema = z.object({
  month: z.coerce.number().int().min(0).max(11),
  year: z.coerce.number().int().min(2000).max(2100),
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
  if (!Number.isFinite(num)) return 0;
  return num;
}

async function readFileBytes(fileUrl: string): Promise<Uint8Array> {
  if (/^https?:\/\//i.test(fileUrl)) {
    const res = await fetch(fileUrl);
    if (!res.ok) {
      throw new Error("Failed to read advance file from storage");
    }
    return new Uint8Array(await res.arrayBuffer());
  }

  const normalized = fileUrl.replace(/^\/+/, "");
  const absolute = path.join(process.cwd(), "public", normalized);
  return new Uint8Array(await fs.readFile(absolute));
}

export async function GET(req: Request) {
  const { error, session } = await requireClientModule("payroll");
  if (error || !session) return error;
  if (!session.clientId) return fail("Unauthorized", 401);
  const clientId = session.clientId;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    month: url.searchParams.get("month"),
    year: url.searchParams.get("year"),
  });
  if (!parsed.success) {
    return fail("Invalid query", 400, parsed.error.flatten());
  }

  const monthLabel = MONTHS[parsed.data.month];
  const safeMonth = monthLabel.replace(/[^a-zA-Z0-9_-]/g, "_");
  const pattern = `advance_${safeMonth}_${parsed.data.year}_`;

  const prefix = `advance-generated/${clientId}/`;
  const listed = await listSupabaseFilesByPrefix(prefix);
  if (!listed.ok) return fail(listed.error, 500);

  const candidate = listed.files.find((file) => file.name.startsWith(pattern));
  if (!candidate) {
    return ok("No advance file for period", {
      month: parsed.data.month,
      year: parsed.data.year,
      amounts: {},
    });
  }

  try {
    const bytes = await readFileBytes(candidate.fileUrl);
    const wb = XLSX.read(bytes, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      range: 2, // headers are on 3rd row because file has title + blank line
    }) as Record<string, unknown>[];

    const amounts: Record<string, number> = {};
    for (const row of rows) {
      const code = normalizeEmployeeCode(row["Emp No"]);
      if (!code) continue;
      amounts[code] = toSafeNumber(row["Advance"]);
    }

    return ok("Advance amounts fetched", {
      month: parsed.data.month,
      year: parsed.data.year,
      fileName: candidate.name,
      amounts,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to parse advance file";
    return fail(message, 500);
  }
}

