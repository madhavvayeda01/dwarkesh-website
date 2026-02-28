import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { CLIENT_PAGE_DEFINITIONS, CLIENT_PAGE_KEYS, type ClientPageKey, type ModuleKey } from "@/lib/module-config";
import {
  getClientModuleAccess,
  getStoredClientPageAccess,
  PageAccessMap,
  mergePageAccess,
  toDbUpdatePayload,
} from "@/lib/module-control";

const querySchema = z.object({
  clientId: z.string().trim().optional(),
});

const updateSchema = z.object({
  clientId: z.string().trim().min(1),
  modules: z
    .object({
      employees: z.boolean().optional(),
      payroll: z.boolean().optional(),
      in_out: z.boolean().optional(),
      training: z.boolean().optional(),
      committees: z.boolean().optional(),
      documents: z.boolean().optional(),
      audit: z.boolean().optional(),
      chat: z.boolean().optional(),
      notifications: z.boolean().optional(),
    })
    .optional(),
  pages: z
    .object(
      Object.fromEntries(CLIENT_PAGE_KEYS.map((key) => [key, z.boolean().optional()])) as Record<
        ClientPageKey,
        z.ZodOptional<z.ZodBoolean>
      >
    )
    .optional(),
}).refine((value) => {
  const hasModules = value.modules && Object.keys(value.modules).length > 0;
  const hasPages = value.pages && Object.keys(value.pages).length > 0;
  return !!hasModules || !!hasPages;
}, {
  message: "At least one module or page toggle is required",
});

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    clientId: url.searchParams.get("clientId") || undefined,
  });
  if (!parsed.success) return fail("Invalid query", 400, parsed.error.flatten());

  const clients = await prisma.client.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { createdAt: "desc" },
  });

  if (!parsed.data.clientId) {
    return ok("Module control clients fetched", { clients, pageDefinitions: CLIENT_PAGE_DEFINITIONS });
  }

  const client = clients.find((item) => item.id === parsed.data.clientId);
  if (!client) return fail("Client not found", 404);

  const modules = await getClientModuleAccess(client.id);
  const pages = await getStoredClientPageAccess(client.id);
  return ok("Module control fetched", {
    clients,
    selectedClient: client,
    modules,
    pages,
    pageDefinitions: CLIENT_PAGE_DEFINITIONS,
  });
}

export async function PATCH(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());

  const client = await prisma.client.findUnique({
    where: { id: parsed.data.clientId },
    select: { id: true },
  });
  if (!client) return fail("Client not found", 404);

  const pageAccess =
    parsed.data.pages && Object.keys(parsed.data.pages).length > 0
      ? mergePageAccess(await getStoredClientPageAccess(parsed.data.clientId), parsed.data.pages as Partial<PageAccessMap>)
      : undefined;

  await prisma.moduleControl.upsert({
    where: { clientId: parsed.data.clientId },
    create: {
      clientId: parsed.data.clientId,
      ...toDbUpdatePayload(parsed.data.modules || {}),
      ...(pageAccess ? { pageAccess } : {}),
    },
    update: {
      ...toDbUpdatePayload(parsed.data.modules || {}),
      ...(pageAccess ? { pageAccess } : {}),
    },
  });

  const modules = await getClientModuleAccess(parsed.data.clientId);
  const pages = await getStoredClientPageAccess(parsed.data.clientId);
  return ok("Module control updated", { clientId: parsed.data.clientId, modules, pages });
}
