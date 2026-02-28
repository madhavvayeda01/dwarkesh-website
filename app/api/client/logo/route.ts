import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireClient } from "@/lib/auth-guards";
import { ensureStorageConfigured, uploadToSupabase } from "@/lib/storage";

const imageSchema = z.object({
  type: z.string().startsWith("image/"),
  size: z.number().max(5 * 1024 * 1024),
});

export async function POST(req: Request) {
  const { error } = await requireClient();
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

    return ok("Logo uploaded", { logoUrl: uploaded.fileUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return fail(message, 500);
  }
}
