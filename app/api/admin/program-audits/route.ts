import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";

const createSchema = z.object({
  name: z.string().trim().min(1),
  parameterOptionIds: z.array(z.string()).default([]),
  documentOptionIds: z.array(z.string()).default([]),
  floorOptionIds: z.array(z.string()).default([]),
});

function hasAuditModels(): boolean {
  const p = prisma as any;
  return !!(
    p?.auditParameterOption &&
    p?.auditDocumentOption &&
    p?.auditFloorOption &&
    p?.programAudit
  );
}

function resolveNames(
  ids: string[],
  byId: Record<string, string>
) {
  return ids.map((id) => byId[id]).filter(Boolean);
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  if (!hasAuditModels()) {
    return fail("Audit models not available in Prisma client. Run prisma generate and migrate.", 500);
  }

  const [audits, parameterOptions, documentOptions, floorOptions] = await Promise.all([
    prisma.programAudit.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.auditParameterOption.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.auditDocumentOption.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.auditFloorOption.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const parameterById = Object.fromEntries(parameterOptions.map((item) => [item.id, item.name]));
  const documentById = Object.fromEntries(documentOptions.map((item) => [item.id, item.name]));
  const floorById = Object.fromEntries(floorOptions.map((item) => [item.id, item.name]));

  const records = audits.map((audit) => ({
    ...audit,
    parameters: resolveNames(audit.parameterOptionIds, parameterById),
    documents: resolveNames(audit.documentOptionIds, documentById),
    floorRequirements: resolveNames(audit.floorOptionIds, floorById),
  }));

  return ok("Program audits fetched", { audits: records });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  if (!hasAuditModels()) {
    return fail("Audit models not available in Prisma client. Run prisma generate and migrate.", 500);
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());

  try {
    const audit = await prisma.programAudit.create({
      data: {
        name: parsed.data.name,
        parameterOptionIds: parsed.data.parameterOptionIds,
        documentOptionIds: parsed.data.documentOptionIds,
        floorOptionIds: parsed.data.floorOptionIds,
      },
    });
    return ok("Program audit created", { audit }, 201);
  } catch (err: any) {
    return fail(err?.message || "Failed to create program audit", 500);
  }
}
