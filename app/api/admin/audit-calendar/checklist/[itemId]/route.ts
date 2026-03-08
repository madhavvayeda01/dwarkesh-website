import { AuditChecklistSource } from "@prisma/client";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdminPage } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const updateChecklistSchema = z
  .object({
    completed: z.boolean().optional(),
    notes: z.string().trim().optional().nullable(),
    visitId: z.string().trim().optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No checklist changes provided.",
  });

type RouteContext = {
  params: Promise<{ itemId: string }>;
};

function cleanNullableString(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function PATCH(req: Request, context: RouteContext) {
  const { error } = await requireAdminPage("audit_calendar");
  if (error) return error;

  const parsed = updateChecklistSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail("Invalid payload", 400, parsed.error.flatten());
  }

  const { itemId } = await context.params;
  const existing = await prisma.auditChecklistItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      auditScheduleId: true,
    },
  });
  if (!existing) return fail("Checklist item not found.", 404);

  const visitId = cleanNullableString(parsed.data.visitId);
  if (parsed.data.visitId !== undefined && visitId) {
    const visit = await prisma.auditVisit.findFirst({
      where: {
        id: visitId,
        auditScheduleId: existing.auditScheduleId,
      },
      select: { id: true },
    });
    if (!visit) return fail("Selected visit does not belong to this audit schedule.", 400);
  }

  const completedAt =
    parsed.data.completed === undefined
      ? undefined
      : parsed.data.completed
        ? new Date()
        : null;

  const item = await prisma.auditChecklistItem.update({
    where: { id: itemId },
    data: {
      ...(parsed.data.completed !== undefined ? { completed: parsed.data.completed } : {}),
      ...(parsed.data.completed !== undefined ? { completedAt } : {}),
      ...(parsed.data.notes !== undefined ? { notes: cleanNullableString(parsed.data.notes) } : {}),
      ...(parsed.data.visitId !== undefined ? { visitId } : {}),
    },
  });

  return ok("Checklist item updated", {
    item: {
      id: item.id,
      auditScheduleId: item.auditScheduleId,
      visitId: item.visitId,
      source: item.source,
      label: item.label,
      details: item.details,
      sortOrder: item.sortOrder,
      completed: item.completed,
      completedAt: item.completedAt?.toISOString() || null,
      notes: item.notes,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(_: Request, context: RouteContext) {
  const { error } = await requireAdminPage("audit_calendar");
  if (error) return error;

  const { itemId } = await context.params;
  const existing = await prisma.auditChecklistItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      source: true,
    },
  });
  if (!existing) return fail("Checklist item not found.", 404);
  if (existing.source !== AuditChecklistSource.MANUAL) {
    return fail("Only manual checklist items can be deleted.", 403);
  }

  await prisma.auditChecklistItem.delete({
    where: { id: itemId },
  });

  return ok("Checklist item deleted", { id: itemId });
}
