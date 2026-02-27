import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import {
  getClientModuleAccess,
  MODULE_KEYS,
  ModuleKey,
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
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one module toggle is required",
    }),
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
    return ok("Module control clients fetched", { clients });
  }

  const client = clients.find((item) => item.id === parsed.data.clientId);
  if (!client) return fail("Client not found", 404);

  const modules = await getClientModuleAccess(client.id);
  return ok("Module control fetched", { clients, selectedClient: client, modules });
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

  await prisma.moduleControl.upsert({
    where: { clientId: parsed.data.clientId },
    create: {
      clientId: parsed.data.clientId,
      ...toDbUpdatePayload(parsed.data.modules),
    },
    update: toDbUpdatePayload(parsed.data.modules),
  });

  const modules = await getClientModuleAccess(parsed.data.clientId);
  return ok("Module control updated", { clientId: parsed.data.clientId, modules });
}
