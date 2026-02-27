import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import {
  deleteObjectByPath,
  listSupabaseFilesByPrefix,
  uploadToSupabase,
} from "@/lib/storage";

const querySchema = z.object({
  clientId: z.string().trim().min(1),
});

const deleteSchema = z.object({
  clientId: z.string().trim().min(1),
  fileName: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-zA-Z0-9._-]+$/, "Invalid file name"),
});

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    clientId: url.searchParams.get("clientId") || "",
  });
  if (!parsed.success) {
    return fail("clientId is required", 400, parsed.error.flatten());
  }

  const prefix = `training-generated/${parsed.data.clientId}/audit/`;
  const listed = await listSupabaseFilesByPrefix(prefix);
  if (!listed.ok) return fail(listed.error, 500);

  return ok("Audit files fetched", { files: listed.files });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const formData = await req.formData();
  const clientId = String(formData.get("clientId") || "").trim();
  const file = formData.get("file") as File | null;

  if (!clientId) return fail("clientId is required", 400);
  if (!file) return fail("file is required", 400);

  const uploaded = await uploadToSupabase(file, `training-generated/${clientId}/audit`);
  if (!uploaded.ok) return fail(uploaded.error, 500);

  return ok("Audit file uploaded", {
    fileUrl: uploaded.fileUrl,
    fileName: file.name,
  });
}

export async function DELETE(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = deleteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail("Invalid payload", 400, parsed.error.flatten());
  }

  const objectPath = `training-generated/${parsed.data.clientId}/audit/${parsed.data.fileName}`;
  const deleted = await deleteObjectByPath(objectPath);
  if (!deleted.ok) return fail(deleted.error, 500);

  return ok("Audit file deleted", { fileName: parsed.data.fileName });
}
