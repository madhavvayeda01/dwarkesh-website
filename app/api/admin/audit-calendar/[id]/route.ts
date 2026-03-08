import { AuditMode, AuditPriority, AuditScheduleStatus } from "@prisma/client";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdminPage } from "@/lib/auth-guards";
import {
  getAuditCalendarScheduleDetailInclude,
  normalizeAuditScheduleStatus,
  parseDateTimeInput,
  serializeAuditScheduleDetail,
  syncAuditReminderNotices,
} from "@/lib/audit-calendar";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { deleteObjectByPath } from "@/lib/storage";

const updateSchema = z
  .object({
    clientId: z.string().trim().optional(),
    programAuditId: z.string().trim().optional().nullable(),
    title: z.string().trim().optional(),
    description: z.string().trim().optional().nullable(),
    status: z.nativeEnum(AuditScheduleStatus).optional(),
    priority: z.nativeEnum(AuditPriority).optional(),
    mode: z.nativeEnum(AuditMode).optional(),
    location: z.string().trim().optional().nullable(),
    scheduledStartAt: z.string().trim().optional(),
    scheduledEndAt: z.string().trim().optional().nullable(),
    ownerConsultantId: z.string().trim().optional().nullable(),
    followUpAt: z.string().trim().optional().nullable(),
    internalNotes: z.string().trim().optional().nullable(),
    outcomeSummary: z.string().trim().optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No schedule changes provided.",
  });

type RouteContext = {
  params: Promise<{ id: string }>;
};

function cleanNullableString(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(_: Request, context: RouteContext) {
  const { error } = await requireAdminPage("audit_calendar");
  if (error) return error;

  await syncAuditReminderNotices();

  const { id } = await context.params;
  const schedule = await prisma.auditSchedule.findUnique({
    where: { id },
    include: getAuditCalendarScheduleDetailInclude(),
  });
  if (!schedule) return fail("Audit schedule not found.", 404);

  return ok("Audit schedule fetched", {
    schedule: serializeAuditScheduleDetail(schedule),
  });
}

export async function PATCH(req: Request, context: RouteContext) {
  const { error } = await requireAdminPage("audit_calendar");
  if (error) return error;

  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail("Invalid payload", 400, parsed.error.flatten());
  }

  const existing = await prisma.auditSchedule.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      scheduledStartAt: true,
    },
  });
  if (!existing) return fail("Audit schedule not found.", 404);

  const scheduledStartAt =
    parsed.data.scheduledStartAt !== undefined
      ? parseDateTimeInput(parsed.data.scheduledStartAt)
      : existing.scheduledStartAt;
  const scheduledEndAt =
    parsed.data.scheduledEndAt !== undefined
      ? parseDateTimeInput(parsed.data.scheduledEndAt)
      : undefined;
  const followUpAt =
    parsed.data.followUpAt !== undefined ? parseDateTimeInput(parsed.data.followUpAt) : undefined;

  if (parsed.data.scheduledStartAt !== undefined && !scheduledStartAt) {
    return fail("Invalid start date and time.", 400);
  }
  if (parsed.data.scheduledEndAt !== undefined && parsed.data.scheduledEndAt && !scheduledEndAt) {
    return fail("Invalid end date and time.", 400);
  }
  if (parsed.data.followUpAt !== undefined && parsed.data.followUpAt && !followUpAt) {
    return fail("Invalid follow-up date and time.", 400);
  }
  if (scheduledStartAt && scheduledEndAt && scheduledEndAt.getTime() < scheduledStartAt.getTime()) {
    return fail("End date and time must be after the start.", 400);
  }

  const nextClientId = parsed.data.clientId;
  if (nextClientId) {
    const client = await prisma.client.findUnique({
      where: { id: nextClientId },
      select: { id: true },
    });
    if (!client) return fail("Client not found.", 404);
  }

  if (parsed.data.programAuditId) {
    const programAudit = await prisma.programAudit.findUnique({
      where: { id: parsed.data.programAuditId },
      select: { id: true },
    });
    if (!programAudit) return fail("Program audit not found.", 404);
  }

  const ownerConsultantId = cleanNullableString(parsed.data.ownerConsultantId);
  if (parsed.data.ownerConsultantId !== undefined && ownerConsultantId) {
    const consultant = await prisma.consultant.findUnique({
      where: { id: ownerConsultantId },
      select: { id: true },
    });
    if (!consultant) return fail("Assigned consultant not found.", 404);
  }

  const nextStatus = normalizeAuditScheduleStatus(
    parsed.data.status || existing.status,
    scheduledStartAt || existing.scheduledStartAt
  );

  const schedule = await prisma.auditSchedule
    .update({
      where: { id },
      data: {
        ...(nextClientId ? { clientId: nextClientId } : {}),
        ...(parsed.data.programAuditId !== undefined
          ? { programAuditId: cleanNullableString(parsed.data.programAuditId) }
          : {}),
        ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
        ...(parsed.data.description !== undefined
          ? { description: cleanNullableString(parsed.data.description) }
          : {}),
        ...(parsed.data.priority ? { priority: parsed.data.priority } : {}),
        ...(parsed.data.mode ? { mode: parsed.data.mode } : {}),
        ...(parsed.data.location !== undefined
          ? { location: cleanNullableString(parsed.data.location) }
          : {}),
        ...(parsed.data.scheduledStartAt !== undefined && scheduledStartAt
          ? { scheduledStartAt }
          : {}),
        ...(parsed.data.scheduledEndAt !== undefined ? { scheduledEndAt: scheduledEndAt ?? null } : {}),
        ...(parsed.data.ownerConsultantId !== undefined ? { ownerConsultantId } : {}),
        ...(parsed.data.followUpAt !== undefined ? { followUpAt: followUpAt ?? null } : {}),
        ...(parsed.data.internalNotes !== undefined
          ? { internalNotes: cleanNullableString(parsed.data.internalNotes) }
          : {}),
        ...(parsed.data.outcomeSummary !== undefined
          ? { outcomeSummary: cleanNullableString(parsed.data.outcomeSummary) }
          : {}),
        status: nextStatus,
      },
      include: getAuditCalendarScheduleDetailInclude(),
    })
    .catch(() => null);

  if (!schedule) return fail("Failed to update audit schedule.", 500);

  return ok("Audit schedule updated", {
    schedule: serializeAuditScheduleDetail(schedule),
  });
}

export async function DELETE(_: Request, context: RouteContext) {
  const { error } = await requireAdminPage("audit_calendar");
  if (error) return error;

  const { id } = await context.params;
  const existing = await prisma.auditSchedule.findUnique({
    where: { id },
    select: {
      id: true,
      attachments: {
        select: {
          filePath: true,
        },
      },
      visits: {
        select: {
          attachments: {
            select: {
              filePath: true,
            },
          },
        },
      },
    },
  });
  if (!existing) return fail("Audit schedule not found.", 404);

  const filePaths = [
    ...existing.attachments.map((attachment) => attachment.filePath),
    ...existing.visits.flatMap((visit) => visit.attachments.map((attachment) => attachment.filePath)),
  ];

  await prisma.auditSchedule.delete({
    where: { id },
  });

  const storageErrors: string[] = [];
  for (const filePath of filePaths) {
    const removed = await deleteObjectByPath(filePath);
    if (!removed.ok) {
      storageErrors.push(`${filePath}: ${removed.error}`);
    }
  }

  if (storageErrors.length > 0) {
    logger.warn("audit.calendar.schedule.delete.storage_warning", {
      auditScheduleId: id,
      storageErrors,
    });
  }

  return ok("Audit schedule deleted", {
    id,
    storageErrors,
  });
}
