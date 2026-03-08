import { AuditScheduleStatus } from "@prisma/client";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdminPage } from "@/lib/auth-guards";
import { parseDateTimeInput } from "@/lib/audit-calendar";
import { prisma } from "@/lib/prisma";

const PROMOTE_TO_VISIT_PLANNED: AuditScheduleStatus[] = [
  AuditScheduleStatus.DRAFT,
  AuditScheduleStatus.SCHEDULED,
  AuditScheduleStatus.RESCHEDULED,
  AuditScheduleStatus.OVERDUE,
];

const createVisitSchema = z.object({
  title: z.string().trim().min(1, "Visit title is required."),
  purpose: z.string().trim().optional().nullable(),
  plannedStartAt: z.string().trim().min(1, "Visit start is required."),
  plannedEndAt: z.string().trim().optional().nullable(),
  location: z.string().trim().optional().nullable(),
  contactPerson: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
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

  const parsed = createVisitSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail("Invalid payload", 400, parsed.error.flatten());
  }

  const plannedStartAt = parseDateTimeInput(parsed.data.plannedStartAt);
  const plannedEndAt = parseDateTimeInput(parsed.data.plannedEndAt);
  if (!plannedStartAt) return fail("Invalid visit start date and time.", 400);
  if (parsed.data.plannedEndAt && !plannedEndAt) return fail("Invalid visit end date and time.", 400);
  if (plannedEndAt && plannedEndAt.getTime() < plannedStartAt.getTime()) {
    return fail("Visit end date and time must be after the start.", 400);
  }

  const { id } = await context.params;
  const schedule = await prisma.auditSchedule.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
    },
  });
  if (!schedule) return fail("Audit schedule not found.", 404);

  const visit = await prisma.$transaction(async (tx) => {
    const created = await tx.auditVisit.create({
      data: {
        auditScheduleId: id,
        title: parsed.data.title.trim(),
        purpose: cleanNullableString(parsed.data.purpose),
        plannedStartAt,
        plannedEndAt,
        location: cleanNullableString(parsed.data.location),
        contactPerson: cleanNullableString(parsed.data.contactPerson),
        notes: cleanNullableString(parsed.data.notes),
      },
      include: {
        attachments: {
          orderBy: { createdAt: "desc" },
        },
        reminderNotices: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (PROMOTE_TO_VISIT_PLANNED.includes(schedule.status)) {
      await tx.auditSchedule.update({
        where: { id },
        data: {
          status: AuditScheduleStatus.VISIT_PLANNED,
        },
      });
    }

    return created;
  });

  return ok("Audit visit created", {
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
