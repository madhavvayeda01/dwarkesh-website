import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";

const DEFAULT_PARAMETER_OPTIONS = ["Social", "Environmental", "Quality", "Security"];

const querySchema = z.object({
  type: z.enum(["parameter", "document", "floor"]),
});

const createSchema = z.object({
  type: z.enum(["parameter", "document", "floor"]),
  name: z.string().trim().min(1),
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

async function ensureDefaultParameters() {
  for (const name of DEFAULT_PARAMETER_OPTIONS) {
    await prisma.auditParameterOption.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
}

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  if (!hasAuditModels()) {
    return fail("Audit models not available in Prisma client. Run prisma generate and migrate.", 500);
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    type: url.searchParams.get("type") || "",
  });
  if (!parsed.success) return fail("Invalid type", 400, parsed.error.flatten());

  if (parsed.data.type === "parameter") {
    await ensureDefaultParameters();
  }

  if (parsed.data.type === "parameter") {
    const options = await prisma.auditParameterOption.findMany({
      orderBy: { createdAt: "asc" },
    });
    return ok("Parameter options fetched", { options });
  }

  if (parsed.data.type === "document") {
    const options = await prisma.auditDocumentOption.findMany({
      orderBy: { createdAt: "asc" },
    });
    return ok("Document options fetched", { options });
  }

  const options = await prisma.auditFloorOption.findMany({
    orderBy: { createdAt: "asc" },
  });
  return ok("On-floor options fetched", { options });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  if (!hasAuditModels()) {
    return fail("Audit models not available in Prisma client. Run prisma generate and migrate.", 500);
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());

  const name = parsed.data.name;
  const type = parsed.data.type;

  try {
    if (type === "parameter") {
      const created = await prisma.auditParameterOption.create({ data: { name } });
      return ok("Parameter option created", { option: created }, 201);
    }

    if (type === "document") {
      const created = await prisma.auditDocumentOption.create({ data: { name } });
      return ok("Document option created", { option: created }, 201);
    }

    const created = await prisma.auditFloorOption.create({ data: { name } });
    return ok("On-floor option created", { option: created }, 201);
  } catch (err: any) {
    if (err?.code === "P2002") {
      return fail("Option already exists", 409);
    }
    return fail(err?.message || "Failed to create option", 500);
  }
}
