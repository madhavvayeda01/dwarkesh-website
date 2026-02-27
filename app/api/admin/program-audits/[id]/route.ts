import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";

const updateSchema = z.object({
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
    const audit = await prisma.programAudit.update({
      where: { id },
      data: {
        name: parsed.data.name,
        parameterOptionIds: parsed.data.parameterOptionIds,
        documentOptionIds: parsed.data.documentOptionIds,
        floorOptionIds: parsed.data.floorOptionIds,
      },
    });
    return ok("Program audit updated", { audit });
  } catch (err: any) {
    return fail(err?.message || "Failed to update program audit", 500);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;
  if (!hasAuditModels()) {
    return fail("Audit models not available in Prisma client. Run prisma generate and migrate.", 500);
  }

  const { id } = await params;

  try {
    await prisma.programAudit.delete({ where: { id } });
    return ok("Program audit deleted", null);
  } catch (err: any) {
    return fail(err?.message || "Failed to delete program audit", 500);
  }
}
