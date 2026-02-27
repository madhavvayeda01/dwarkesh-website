import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { ensureStorageConfigured, uploadToSupabase } from "@/lib/storage";
import { logger } from "@/lib/logger";

const imageSchema = z.object({
  type: z.string().startsWith("image/"),
  size: z.number().max(5 * 1024 * 1024),
});

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const storageError = ensureStorageConfigured();
  if (storageError) return storageError;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return fail("No file uploaded", 400);

    const valid = imageSchema.safeParse({ type: file.type, size: file.size });
    if (!valid.success) {
      return fail("Invalid image file", 400, valid.error.flatten());
    }

    const uploaded = await uploadToSupabase(file, "client-logos");
    if (!uploaded.ok) return fail(uploaded.error, 500);

    logger.info("admin.client_logo.upload.success", { fileName: file.name });
    return ok("Logo uploaded", { logoUrl: uploaded.fileUrl });
  } catch (err: any) {
    logger.error("admin.client_logo.upload.error", { message: err?.message });
    return fail(err?.message || "Upload failed", 500);
  }
}
