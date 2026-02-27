import fs from "node:fs/promises";
import path from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "uploads";
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function normalizePrefix(prefix: string) {
  const trimmed = prefix.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function toSafeObjectPath(objectPath: string) {
  return objectPath
    .split("/")
    .filter(Boolean)
    .map((part) => sanitizeFileName(part))
    .join("/");
}

function getHeaders(contentType = "application/octet-stream") {
  return {
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    apikey: SUPABASE_SERVICE_ROLE_KEY || "",
    "Content-Type": contentType,
    "x-upsert": "false",
  };
}

async function writeLocalObject(
  objectPath: string,
  bytes: Uint8Array
): Promise<{ ok: true; fileUrl: string } | { ok: false; error: string }> {
  try {
    const safeObjectPath = toSafeObjectPath(objectPath);
    const absolutePath = path.join(process.cwd(), "public", "uploads", safeObjectPath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, bytes);
    return { ok: true, fileUrl: `/uploads/${safeObjectPath}` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Local storage write failed";
    return { ok: false, error: message };
  }
}

export async function uploadToSupabase(
  file: File,
  folder: string
): Promise<{ ok: true; fileUrl: string } | { ok: false; error: string }> {
  const safeName = `${Date.now()}_${sanitizeFileName(file.name)}`;
  const safeFolder = toSafeObjectPath(folder);
  const objectPath = `${safeFolder}/${safeName}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (!USE_SUPABASE) {
    return writeLocalObject(objectPath, bytes);
  }

  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${objectPath}`;
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: getHeaders(file.type || "application/octet-stream"),
    body: bytes,
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Upload failed: ${text}` };
  }

  const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${objectPath}`;
  return { ok: true, fileUrl };
}

export async function uploadBufferToSupabase(
  bytes: Buffer,
  objectPath: string,
  contentType = "application/octet-stream"
): Promise<{ ok: true; fileUrl: string } | { ok: false; error: string }> {
  const safeObjectPath = toSafeObjectPath(objectPath);
  const payload = new Uint8Array(bytes);

  if (!USE_SUPABASE) {
    return writeLocalObject(safeObjectPath, payload);
  }

  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${safeObjectPath}`;
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: getHeaders(contentType),
    body: payload,
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Upload failed: ${text}` };
  }

  const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${safeObjectPath}`;
  return { ok: true, fileUrl };
}

type ListedObject = {
  name: string;
  updated_at?: string;
};

export async function listSupabaseFilesByPrefix(
  prefix: string
): Promise<
  { ok: true; files: Array<{ name: string; fileUrl: string; updatedAt: string | null }> } | {
    ok: false;
    error: string;
  }
> {
  const safePrefix = normalizePrefix(toSafeObjectPath(prefix));

  if (!USE_SUPABASE) {
    try {
      const folderPath = path.join(process.cwd(), "public", "uploads", safePrefix);
      const entries = await fs.readdir(folderPath, { withFileTypes: true });
      const files = await Promise.all(
        entries
          .filter((entry) => entry.isFile())
          .map(async (entry) => {
            const stats = await fs.stat(path.join(folderPath, entry.name));
            return {
              name: entry.name,
              fileUrl: `/uploads/${safePrefix}${entry.name}`,
              updatedAt: stats.mtime.toISOString(),
            };
          })
      );
      files.sort((a, b) => (a.updatedAt && b.updatedAt ? b.updatedAt.localeCompare(a.updatedAt) : 0));
      return { ok: true, files };
    } catch {
      return { ok: true, files: [] };
    }
  }

  const listUrl = `${SUPABASE_URL}/storage/v1/object/list/${SUPABASE_BUCKET}`;
  const res = await fetch(listUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY || "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prefix: safePrefix,
      limit: 1000,
      offset: 0,
      sortBy: { column: "updated_at", order: "desc" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `List failed: ${text}` };
  }

  const json = (await res.json()) as ListedObject[];
  const files = json
    .filter((entry) => entry.name && !entry.name.endsWith("/"))
    .map((entry) => ({
      name: entry.name,
      fileUrl: `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${safePrefix}${entry.name}`,
      updatedAt: entry.updated_at || null,
    }));

  return { ok: true, files };
}

export async function deleteObjectByPath(
  objectPath: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const safeObjectPath = toSafeObjectPath(objectPath);

  if (!USE_SUPABASE) {
    try {
      const absolutePath = path.join(process.cwd(), "public", "uploads", safeObjectPath);
      await fs.unlink(absolutePath);
      return { ok: true };
    } catch (err: unknown) {
      const anyErr = err as { code?: string; message?: string };
      if (anyErr?.code === "ENOENT") return { ok: true };
      return { ok: false, error: anyErr?.message || "Local delete failed" };
    }
  }

  const deleteUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${safeObjectPath}`;
  const res = await fetch(deleteUrl, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY || "",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Delete failed: ${text}` };
  }

  return { ok: true };
}

export function ensureStorageConfigured() {
  // Local fallback is allowed for development when Supabase is not configured.
  return null;
}
