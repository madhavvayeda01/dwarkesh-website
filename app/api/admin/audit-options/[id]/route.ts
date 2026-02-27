import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";

const updateSchema = z.object({
  type: z.enum(["parameter", "document", "floor"]),
  name: z.string().trim().min(1),
});

const deleteQuerySchema = z.object({
  type: z.enum(["parameter", "document", "floor"]),
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;
  if (!hasAuditModels()) {
    return fail("Audit models not available in Prisma client. Run prisma generate and migrate.", 500);
  }

  const { id } = await params;
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());

  try {
    if (parsed.data.type === "parameter") {
      const option = await prisma.auditParameterOption.update({
        where: { id },
        data: { name: parsed.data.name },
      });
      return ok("Parameter option updated", { option });
    }

    if (parsed.data.type === "document") {
      const option = await prisma.auditDocumentOption.update({
        where: { id },
        data: { name: parsed.data.name },
      });
      return ok("Document option updated", { option });
    }

    const option = await prisma.auditFloorOption.update({
      where: { id },
      data: { name: parsed.data.name },
    });
    return ok("On-floor option updated", { option });
  } catch (err: any) {
    if (err?.code === "P2002") return fail("Option already exists", 409);
    return fail(err?.message || "Failed to update option", 500);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;
  if (!hasAuditModels()) {
    return fail("Audit models not available in Prisma client. Run prisma generate and migrate.", 500);
  }

  const url = new URL(req.url);
  const parsed = deleteQuerySchema.safeParse({
    type: url.searchParams.get("type") || "",
  });
  if (!parsed.success) return fail("Invalid type", 400, parsed.error.flatten());

  const { id } = await params;

  try {
    if (parsed.data.type === "parameter") {
      await prisma.auditParameterOption.delete({ where: { id } });
      const audits = await prisma.programAudit.findMany({
        where: { parameterOptionIds: { has: id } },
      });
      for (const audit of audits) {
        await prisma.programAudit.update({
          where: { id: audit.id },
          data: {
            parameterOptionIds: audit.parameterOptionIds.filter((value) => value !== id),
          },
        });
      }
      return ok("Parameter option deleted", null);
    }

    if (parsed.data.type === "document") {
      await prisma.auditDocumentOption.delete({ where: { id } });
      const audits = await prisma.programAudit.findMany({
        where: { documentOptionIds: { has: id } },
      });
      for (const audit of audits) {
        await prisma.programAudit.update({
          where: { id: audit.id },
          data: {
            documentOptionIds: audit.documentOptionIds.filter((value) => value !== id),
          },
        });
      }
      return ok("Document option deleted", null);
    }

    await prisma.auditFloorOption.delete({ where: { id } });
    const audits = await prisma.programAudit.findMany({
      where: { floorOptionIds: { has: id } },
    });
    for (const audit of audits) {
      await prisma.programAudit.update({
        where: { id: audit.id },
        data: {
          floorOptionIds: audit.floorOptionIds.filter((value) => value !== id),
        },
      });
    }
    return ok("On-floor option deleted", null);
  } catch (err: any) {
    return fail(err?.message || "Failed to delete option", 500);
  }
}
