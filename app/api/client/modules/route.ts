import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireClient } from "@/lib/auth-guards";
import { getClientModuleAccess, MODULE_KEYS, ModuleKey } from "@/lib/module-control";

const querySchema = z.object({
  module: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || MODULE_KEYS.includes(value as ModuleKey), {
      message: "Invalid module",
    }),
});

export async function GET(req: Request) {
  const { error, session } = await requireClient();
  if (error || !session || !session.clientId) return error ?? fail("Unauthorized", 401);

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({ module: url.searchParams.get("module") || undefined });
  if (!parsed.success) return fail("Invalid query", 400, parsed.error.flatten());

  const access = await getClientModuleAccess(session.clientId);
  const moduleKey = parsed.data.module as ModuleKey | undefined;

  if (moduleKey) {
    return ok("Module access fetched", {
      module: moduleKey,
      enabled: access[moduleKey],
      modules: access,
    });
  }

  return ok("Module access fetched", { modules: access });
}
