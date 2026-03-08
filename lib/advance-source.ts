import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { normalizeEmployeeCode } from "@/lib/employee-code";
import { listSupabaseFilesByPrefix } from "@/lib/storage";

export const ADVANCE_MONTHS = [
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

export type AdvanceSourceRow = {
  empNo: string;
  lookupCode: string;
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

export type AdvanceSourceDebug = {
  month: number;
  year: number;
  fileName: string | null;
  fileUrl: string | null;
  updatedAt: string | null;
  parsedRows: number;
  uniqueCodes: number;
  matchingFilesCount: number;
  warnings: string[];
};

export type AdvanceSource = {
  debug: AdvanceSourceDebug;
  rows: AdvanceSourceRow[];
  rowsByCode: Map<string, AdvanceSourceRow>;
  amountsByCode: Map<string, number>;
};

function toSafeNumber(value: unknown): number {
  const num = Number(String(value ?? "").replace(/,/g, "").trim());
  if (!Number.isFinite(num) || num < 0) return 0;
  return num;
}

async function listLocalAdvanceFilesByPrefix(
  prefix: string
): Promise<Array<{ name: string; fileUrl: string; updatedAt: string | null }>> {
  try {
    const normalizedPrefix = prefix
      .trim()
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .replace(/\/?$/, "/");
    const folderPath = path.join(process.cwd(), "public", "uploads", normalizedPrefix);
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const stats = await fs.stat(path.join(folderPath, entry.name));
          return {
            name: entry.name,
            fileUrl: `/uploads/${normalizedPrefix}${entry.name}`,
            updatedAt: stats.mtime.toISOString(),
          };
        })
    );
    return files;
  } catch {
    return [];
  }
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

function getFileTimestamp(fileName: string, updatedAt: string | null): number {
  const parsedUpdatedAt = Date.parse(updatedAt || "");
  if (Number.isFinite(parsedUpdatedAt)) return parsedUpdatedAt;
  const stampMatch = fileName.match(/_(\d+)\.[^.]+$/);
  if (!stampMatch) return 0;
  const stamp = Number(stampMatch[1]);
  return Number.isFinite(stamp) ? stamp : 0;
}

export async function loadAdvanceSource(
  clientId: string,
  monthIndex: number,
  year: number
): Promise<AdvanceSource> {
  const monthLabel = ADVANCE_MONTHS[monthIndex];
  const safeMonth = monthLabel.replace(/[^a-zA-Z0-9_-]/g, "_");
  const pattern = `advance_${safeMonth}_${year}_`;
  const prefix = `advance-generated/${clientId}/`;
  const listed = await listSupabaseFilesByPrefix(prefix);
  if (!listed.ok) {
    throw new Error(listed.error);
  }

  let availableFiles = listed.files;
  if (availableFiles.length === 0) {
    const localFallbackFiles = await listLocalAdvanceFilesByPrefix(prefix);
    if (localFallbackFiles.length > 0) {
      availableFiles = localFallbackFiles;
    }
  }

  const matchingFiles = availableFiles
    .filter((file) => file.name.startsWith(pattern))
    .sort((a, b) => getFileTimestamp(b.name, b.updatedAt) - getFileTimestamp(a.name, a.updatedAt));

  const warnings: string[] = [];
  if (matchingFiles.length > 1) {
    warnings.push(
      `Multiple advance files found for ${monthLabel} ${year}. Latest file was selected automatically.`
    );
  }

  const selected = matchingFiles[0];
  if (!selected) {
    return {
      debug: {
        month: monthIndex,
        year,
        fileName: null,
        fileUrl: null,
        updatedAt: null,
        parsedRows: 0,
        uniqueCodes: 0,
        matchingFilesCount: 0,
        warnings,
      },
      rows: [],
      rowsByCode: new Map(),
      amountsByCode: new Map(),
    };
  }

  const bytes = await readFileBytes(selected.fileUrl);
  const workbook = XLSX.read(bytes, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    range: 2,
  }) as Record<string, unknown>[];

  const rows: AdvanceSourceRow[] = [];
  const rowsByCode = new Map<string, AdvanceSourceRow>();
  const amountsByCode = new Map<string, number>();
  for (const row of rawRows) {
    const empNo = String(row["Emp No"] ?? "").trim();
    const lookupCode = normalizeEmployeeCode(empNo);
    if (!lookupCode) continue;
    const parsedRow: AdvanceSourceRow = {
      empNo,
      lookupCode,
      name: String(row["Name"] ?? "").trim(),
      department: String(row["Department"] ?? "").trim(),
      designation: String(row["Designation"] ?? "").trim(),
      rateOfPay: toSafeNumber(row["Rate of pay"]),
      presentDay: toSafeNumber(row["Present day"] ?? row["Present Day"]),
      advance: toSafeNumber(row["Advance"]),
      accountNo: String(row["Account No."] ?? "").trim(),
      ifsc: String(row["IFSC"] ?? "").trim(),
      bankName: String(row["Bank Name"] ?? "").trim(),
    };
    rows.push(parsedRow);
    rowsByCode.set(lookupCode, parsedRow);
    amountsByCode.set(lookupCode, parsedRow.advance);
  }

  return {
    debug: {
      month: monthIndex,
      year,
      fileName: selected.name,
      fileUrl: selected.fileUrl,
      updatedAt: selected.updatedAt,
      parsedRows: rawRows.length,
      uniqueCodes: amountsByCode.size,
      matchingFilesCount: matchingFiles.length,
      warnings,
    },
    rows,
    rowsByCode,
    amountsByCode,
  };
}
