import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { listSupabaseFilesByPrefix } from "@/lib/storage";

const querySchema = z.object({
  module: z.enum(["audit", "documents", "training", "committees"]),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    module: (url.searchParams.get("module") || "").trim(),
  });
  if (!parsed.success) {
    return fail("Invalid module", 400, parsed.error.flatten());
  }

  const moduleKey = parsed.data.module;

  if (moduleKey === "audit") {
    const guard = await requireClientModule("audit");
    if (guard.error || !guard.session) return guard.error;
    const prefix = `training-generated/${guard.session.clientId}/${parsed.data.module}/`;
    const listed = await listSupabaseFilesByPrefix(prefix);
    if (!listed.ok) return fail(listed.error, 500);
    const pdfFiles = listed.files.filter((file) => file.name.toLowerCase().endsWith(".pdf"));
    return ok("Generated files fetched", { files: pdfFiles });
  }

  if (moduleKey === "documents") {
    const guard = await requireClientModule("documents");
    if (guard.error || !guard.session) return guard.error;
    const prefix = `training-generated/${guard.session.clientId}/${parsed.data.module}/`;
    const listed = await listSupabaseFilesByPrefix(prefix);
    if (!listed.ok) return fail(listed.error, 500);
    const pdfFiles = listed.files.filter((file) => file.name.toLowerCase().endsWith(".pdf"));
    return ok("Generated files fetched", { files: pdfFiles });
  }

  if (moduleKey === "training") {
    const guard = await requireClientModule("training");
    if (guard.error || !guard.session) return guard.error;
    const prefix = `training-generated/${guard.session.clientId}/${parsed.data.module}/`;
    const listed = await listSupabaseFilesByPrefix(prefix);
    if (!listed.ok) return fail(listed.error, 500);
    const pdfFiles = listed.files.filter((file) => file.name.toLowerCase().endsWith(".pdf"));
    return ok("Generated files fetched", { files: pdfFiles });
  }

  const guard = await requireClientModule("committees");
  if (guard.error || !guard.session) return guard.error;

  const prefix = `training-generated/${guard.session.clientId}/${parsed.data.module}/`;
  const listed = await listSupabaseFilesByPrefix(prefix);
  if (!listed.ok) return fail(listed.error, 500);

  const pdfFiles = listed.files.filter((file) => file.name.toLowerCase().endsWith(".pdf"));
  return ok("Generated files fetched", { files: pdfFiles });
}
