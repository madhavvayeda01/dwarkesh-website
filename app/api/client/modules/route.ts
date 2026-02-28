import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireClient } from "@/lib/auth-guards";
import { CLIENT_PAGE_BY_KEY, CLIENT_PAGE_KEYS, type ClientPageKey, MODULE_KEYS, type ModuleKey } from "@/lib/module-config";
import {
  getClientModuleAccess,
  getClientPageAccess,
  getImpersonationPageAccess,
} from "@/lib/module-control";

const querySchema = z.object({
  module: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || MODULE_KEYS.includes(value as ModuleKey), {
      message: "Invalid module",
    }),
  page: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || CLIENT_PAGE_KEYS.includes(value as ClientPageKey), {
      message: "Invalid page",
    }),
});

export async function GET(req: Request) {
  const { error, session } = await requireClient();
  if (error || !session || !session.clientId) return error ?? fail("Unauthorized", 401);

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    module: url.searchParams.get("module") || undefined,
    page: url.searchParams.get("page") || undefined,
  });
  if (!parsed.success) return fail("Invalid query", 400, parsed.error.flatten());

  const moduleAccess = await getClientModuleAccess(session.clientId);
  const pageAccess = session.impersonatedByAdmin
    ? getImpersonationPageAccess(moduleAccess)
    : await getClientPageAccess(session.clientId);
  const moduleKey = parsed.data.module as ModuleKey | undefined;
  const pageKey = parsed.data.page as ClientPageKey | undefined;

  if (moduleKey) {
    return ok("Module access fetched", {
      module: moduleKey,
      enabled: moduleAccess[moduleKey],
      modules: moduleAccess,
      pages: pageAccess,
    });
  }

  if (pageKey) {
    const page = CLIENT_PAGE_BY_KEY[pageKey];
    return ok("Page access fetched", {
      page: pageKey,
      enabled: pageAccess[pageKey] && moduleAccess[page.module],
      modules: moduleAccess,
      pages: pageAccess,
    });
  }

  return ok("Module access fetched", { modules: moduleAccess, pages: pageAccess });
}
