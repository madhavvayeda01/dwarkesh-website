const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);

export const COMPLIANCE_DOCUMENT_STATUS_VALUES = [
  "ACTIVE",
  "NOT_APPLICABLE",
  "NOT_AVAILABLE",
] as const;

export type ComplianceDocumentStatusValue =
  (typeof COMPLIANCE_DOCUMENT_STATUS_VALUES)[number];

export function parseDateInput(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    const utcMs = EXCEL_EPOCH_UTC + Math.floor(value) * 24 * 60 * 60 * 1000;
    const parsed = new Date(utcMs);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const text = String(value).trim();
  if (!text) return null;

  if (/^\d+(\.\d+)?$/.test(text)) {
    return parseDateInput(Number(text));
  }

  const dmy = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(text);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    ) {
      return parsed;
    }
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateForInput(value: Date | null | undefined) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

export function formatDateForDisplay(value: Date | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN");
}

export function normalizeOptionalString(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

export function normalizeComplianceDocumentStatus(
  value: unknown,
  fallback: ComplianceDocumentStatusValue = "ACTIVE"
): ComplianceDocumentStatusValue {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "_");
  return COMPLIANCE_DOCUMENT_STATUS_VALUES.includes(
    normalized as ComplianceDocumentStatusValue
  )
    ? (normalized as ComplianceDocumentStatusValue)
    : fallback;
}
