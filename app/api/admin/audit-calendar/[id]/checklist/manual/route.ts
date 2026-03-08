import { AuditChecklistSource } from "@prisma/client";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdminPage } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const createManualChecklistSchema = z.object({
  label: z.string().trim().min(1, "Checklist label is required."),
  details: z.string().trim().optional().nullable(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

function cleanNullableString(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(req: Request, context: RouteContext) {
  const { error } = await requireAdminPage("audit_calendar");
  if (error) return error;

  const parsed = createManualChecklistSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail("Invalid payload", 400, parsed.error.flatten());
  }

  const { id } = await context.params;
  const schedule = await prisma.auditSchedule.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!schedule) return fail("Audit schedule not found.", 404);

  const latestItem = await prisma.auditChecklistItem.findFirst({
    where: { auditScheduleId: id },
    orderBy: [{ sortOrder: "desc" }, { createdAt: "desc" }],
    select: { sortOrder: true },
  });

  const item = await prisma.auditChecklistItem.create({
    data: {
      auditScheduleId: id,
      source: AuditChecklistSource.MANUAL,
      label: parsed.data.label.trim(),
      details: cleanNullableString(parsed.data.details),
      sortOrder: (latestItem?.sortOrder || 0) + 100,
    },
  });

  return ok("Manual checklist item created", {
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
