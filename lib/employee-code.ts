export function normalizeEmployeeCode(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = String(value).trim().toUpperCase().replace(/^0+/, "");
  return raw;
}

export function normalizeEmployeeCodeOrNull(value: unknown): string | null {
  const normalized = normalizeEmployeeCode(value);
  return normalized || null;
}

