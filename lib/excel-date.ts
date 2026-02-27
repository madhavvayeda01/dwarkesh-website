function formatDateAsDdMmmYyyy(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const year = date.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

export function excelSerialToDateString(serial: number): string | null {
  if (!Number.isFinite(serial)) return null;
  const wholeDays = Math.floor(serial);
  if (wholeDays < 1 || wholeDays > 200000) return null;
  // Excel serial date epoch (with 1900 leap-year compatibility) is 1899-12-30.
  const utcMs = Date.UTC(1899, 11, 30) + wholeDays * 24 * 60 * 60 * 1000;
  const date = new Date(utcMs);
  if (Number.isNaN(date.getTime())) return null;
  return formatDateAsDdMmmYyyy(date);
}

function normalizeDateString(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) {
    return formatDateAsDdMmmYyyy(direct);
  }

  const dmy = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (!dmy) return null;
  const day = Number.parseInt(dmy[1], 10);
  const month = Number.parseInt(dmy[2], 10);
  const year = Number.parseInt(dmy[3], 10);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return formatDateAsDdMmmYyyy(parsed);
}

export function normalizeImportedDate(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;

  if (typeof value === "number") {
    return excelSerialToDateString(value) || undefined;
  }

  const text = String(value).trim();
  if (!text || /^#+$/.test(text)) return undefined;

  if (/^\d+(\.\d+)?$/.test(text)) {
    const asNumber = Number(text);
    const converted = excelSerialToDateString(asNumber);
    if (converted) return converted;
  }

  return normalizeDateString(text) || text;
}

export function normalizeStoredDateMaybe(value: string | null): string | null {
  if (!value) return value;
  const text = value.trim();
  if (!text) return value;

  if (/^\d+(\.\d+)?$/.test(text)) {
    const asNumber = Number(text);
    const converted = excelSerialToDateString(asNumber);
    if (converted) return converted;
  }

  return value;
}

