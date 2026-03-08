import { AuditScheduleStatus, AuditVisitStatus } from "@prisma/client";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdminPage } from "@/lib/auth-guards";
import { parseDateTimeInput } from "@/lib/audit-calendar";
import { prisma } from "@/lib/prisma";
import { deleteObjectByPath } from "@/lib/storage";

const updateVisitSchema = z
  .object({
    title: z.string().trim().optional(),
    purpose: z.string().trim().optional().nullable(),
    plannedStartAt: z.string().trim().optional(),
    plannedEndAt: z.string().trim().optional().nullable(),
    location: z.string().trim().optional().nullable(),
    contactPerson: z.string().trim().optional().nullable(),
    status: z.nativeEnum(AuditVisitStatus).optional(),
    notes: z.string().trim().optional().nullable(),
    outcome: z.string().trim().optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No visit changes provided.",
  });

type RouteContext = {
  params: Promise<{ visitId: string }>;
};

function cleanNullableString(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function PATCH(req: Request, context: RouteContext) {
  const { error } = await requireAdminPage("audit_calendar");
  if (error) return error;

  const parsed = updateVisitSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail("Invalid payload", 400, parsed.error.flatten());
  }

  const { visitId } = await context.params;
  const existing = await prisma.auditVisit.findUnique({
    where: { id: visitId },
    select: {
      id: true,
      plannedStartAt: true,
    },
  });
  if (!existing) return fail("Audit visit not found.", 404);

  const plannedStartAt =
    parsed.data.plannedStartAt !== undefined
      ? parseDateTimeInput(parsed.data.plannedStartAt)
      : existing.plannedStartAt;
  const plannedEndAt =
    parsed.data.plannedEndAt !== undefined
      ? parseDateTimeInput(parsed.data.plannedEndAt)
      : undefined;

  if (parsed.data.plannedStartAt !== undefined && !plannedStartAt) {
    return fail("Invalid visit start date and time.", 400);
  }
  if (parsed.data.plannedEndAt !== undefined && parsed.data.plannedEndAt && !plannedEndAt) {
    return fail("Invalid visit end date and time.", 400);
  }
  if (plannedStartAt && plannedEndAt && plannedEndAt.getTime() < plannedStartAt.getTime()) {
    return fail("Visit end date and time must be after the start.", 400);
  }

  const visit = await prisma.auditVisit.update({
    where: { id: visitId },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
      ...(parsed.data.purpose !== undefined
        ? { purpose: cleanNullableString(parsed.data.purpose) }
        : {}),
      ...(parsed.data.plannedStartAt !== undefined && plannedStartAt
        ? { plannedStartAt }
        : {}),
      ...(parsed.data.plannedEndAt !== undefined ? { plannedEndAt: plannedEndAt ?? null } : {}),
      ...(parsed.data.location !== undefined
        ? { location: cleanNullableString(parsed.data.location) }
        : {}),
      ...(parsed.data.contactPerson !== undefined
        ? { contactPerson: cleanNullableString(parsed.data.contactPerson) }
        : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.notes !== undefined ? { notes: cleanNullableString(parsed.data.notes) } : {}),
      ...(parsed.data.outcome !== undefined
        ? { outcome: cleanNullableString(parsed.data.outcome) }
        : {}),
    },
    include: {
      attachments: {
        orderBy: { createdAt: "desc" },
      },
      reminderNotices: {
        orderBy: { createdAt: "desc" },
      },
      auditSchedule: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (
    visit.auditSchedule.status === AuditScheduleStatus.OVERDUE &&
    visit.status === AuditVisitStatus.PLANNED
  ) {
    await prisma.auditSchedule.update({
      where: { id: visit.auditSchedule.id },
      data: {
        status: AuditScheduleStatus.VISIT_PLANNED,
      },
    });
  }

  return ok("Audit visit updated", {
    visit: {
      id: visit.id,
      auditScheduleId: visit.auditScheduleId,
      title: visit.title,
      purpose: visit.purpose,
      plannedStartAt: visit.plannedStartAt.toISOString(),
      plannedEndAt: visit.plannedEndAt?.toISOString() || null,
      location: visit.location,
      contactPerson: visit.contactPerson,
      status: visit.status,
      notes: visit.notes,
      outcome: visit.outcome,
      createdAt: visit.createdAt.toISOString(),
      updatedAt: visit.updatedAt.toISOString(),
      attachments: visit.attachments.map((attachment) => ({
        id: attachment.id,
        auditScheduleId: attachment.auditScheduleId,
        visitId: attachment.visitId,
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl,
        createdAt: attachment.createdAt.toISOString(),
      })),
      reminders: visit.reminderNotices.map((notice) => ({
        id: notice.id,
        kind: notice.kind,
        notifyAt: notice.notifyAt.toISOString(),
        emailStatus: notice.emailStatus,
        createdAt: notice.createdAt.toISOString(),
      })),
    },
  });
}

export async function DELETE(_: Request, context: RouteContext) {
  const { error } = await requireAdminPage("audit_calendar");
  if (error) return error;

  const { visitId } = await context.params;
  const existing = await prisma.auditVisit.findUnique({
    where: { id: visitId },
    select: {
      id: true,
      auditScheduleId: true,
      attachments: {
        select: {
          filePath: true,
        },
      },
    },
  });
  if (!existing) return fail("Audit visit not found.", 404);

  await prisma.auditVisit.delete({
    where: { id: visitId },
  });

  const remainingVisits = await prisma.auditVisit.count({
    where: {
      auditScheduleId: existing.auditScheduleId,
    },
  });
  if (remainingVisits === 0) {
    await prisma.auditSchedule.updateMany({
      where: {
        id: existing.auditScheduleId,
        status: AuditScheduleStatus.VISIT_PLANNED,
      },
      data: {
        status: AuditScheduleStatus.SCHEDULED,
      },
    });
  }

  const storageErrors: string[] = [];
  for (const attachment of existing.attachments) {
    const removed = await deleteObjectByPath(attachment.filePath);
    if (!removed.ok) {
      storageErrors.push(`${attachment.filePath}: ${removed.error}`);
    }
  }

  return ok("Audit visit deleted", {
    id: visitId,
    storageErrors,
  });
}
