import {
  AuditActorType,
  AuditMode,
  AuditPriority,
  AuditScheduleStatus,
  Prisma,
} from "@prisma/client";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdminPage } from "@/lib/auth-guards";
import {
  buildAuditChecklistSeed,
  getAuditCalendarScheduleInclude,
  getAuditCalendarSummary,
  getAuditScheduleOptionMaps,
  normalizeAuditScheduleStatus,
  parseDateTimeInput,
  serializeAuditScheduleListItem,
  syncAuditReminderNotices,
} from "@/lib/audit-calendar";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  clientId: z.string().trim().optional(),
  status: z.nativeEnum(AuditScheduleStatus).optional(),
  ownerConsultantId: z.string().trim().optional(),
  priority: z.nativeEnum(AuditPriority).optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  search: z.string().trim().optional(),
  view: z.enum(["calendar", "agenda", "board"]).optional(),
});

const createSchema = z.object({
  clientId: z.string().trim().min(1, "Client is required."),
  programAuditId: z.string().trim().optional().nullable(),
  title: z.string().trim().min(1, "Audit title is required."),
  description: z.string().trim().optional().nullable(),
  scheduledStartAt: z.string().trim().min(1, "Start date and time are required."),
  scheduledEndAt: z.string().trim().optional().nullable(),
  priority: z.nativeEnum(AuditPriority).default(AuditPriority.MEDIUM),
  mode: z.nativeEnum(AuditMode).default(AuditMode.ONSITE),
  location: z.string().trim().optional().nullable(),
  ownerConsultantId: z.string().trim().optional().nullable(),
  followUpAt: z.string().trim().optional().nullable(),
  internalNotes: z.string().trim().optional().nullable(),
});

function cleanNullableString(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function getLookups() {
  const [clients, consultants, programAudits] = await Promise.all([
    prisma.client.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.consultant.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.programAudit.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    clients,
    consultants,
    programAudits,
    statuses: Object.values(AuditScheduleStatus),
    priorities: Object.values(AuditPriority),
    modes: Object.values(AuditMode),
  };
}

export async function GET(req: Request) {
  const { error } = await requireAdminPage("audit_calendar");
  if (error) return error;

  await syncAuditReminderNotices();

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    clientId: url.searchParams.get("clientId") || undefined,
    status: url.searchParams.get("status") || undefined,
    ownerConsultantId: url.searchParams.get("ownerConsultantId") || undefined,
    priority: url.searchParams.get("priority") || undefined,
    from: url.searchParams.get("from") || undefined,
    to: url.searchParams.get("to") || undefined,
    search: url.searchParams.get("search") || undefined,
    view: url.searchParams.get("view") || undefined,
  });
  if (!parsed.success) {
    return fail("Invalid query", 400, parsed.error.flatten());
  }

  const from = parsed.data.from ? parseDateTimeInput(parsed.data.from) : null;
  const to = parsed.data.to ? parseDateTimeInput(parsed.data.to) : null;
  if (parsed.data.from && !from) return fail("Invalid from date.", 400);
  if (parsed.data.to && !to) return fail("Invalid to date.", 400);

  const where: Prisma.AuditScheduleWhereInput = {};

  if (parsed.data.clientId) {
    where.clientId = parsed.data.clientId;
  }
  if (parsed.data.status) {
    where.status = parsed.data.status;
  }
  if (parsed.data.ownerConsultantId) {
    if (parsed.data.ownerConsultantId === "__unassigned__") {
      where.ownerConsultantId = null;
    } else {
      where.ownerConsultantId = parsed.data.ownerConsultantId;
    }
  }
  if (parsed.data.priority) {
    where.priority = parsed.data.priority;
  }
  if (from || to) {
    where.scheduledStartAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }
  if (parsed.data.search) {
    const search = parsed.data.search;
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
      { internalNotes: { contains: search, mode: "insensitive" } },
      { client: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [summary, lookups, schedules] = await Promise.all([
    getAuditCalendarSummary(),
    getLookups(),
    prisma.auditSchedule.findMany({
      where,
      include: getAuditCalendarScheduleInclude(),
      orderBy: [{ scheduledStartAt: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  return ok("Audit calendar fetched", {
    view: parsed.data.view || "agenda",
    summary,
    lookups,
    schedules: schedules.map(serializeAuditScheduleListItem),
  });
}

export async function POST(req: Request) {
  const { error, session } = await requireAdminPage("audit_calendar");
  if (error || !session) return error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail("Invalid payload", 400, parsed.error.flatten());
  }

  const scheduledStartAt = parseDateTimeInput(parsed.data.scheduledStartAt);
  const scheduledEndAt = parseDateTimeInput(parsed.data.scheduledEndAt);
  const followUpAt = parseDateTimeInput(parsed.data.followUpAt);
  if (!scheduledStartAt) return fail("Invalid start date and time.", 400);
  if (parsed.data.scheduledEndAt && !scheduledEndAt) return fail("Invalid end date and time.", 400);
  if (parsed.data.followUpAt && !followUpAt) return fail("Invalid follow-up date and time.", 400);
  if (scheduledEndAt && scheduledEndAt.getTime() < scheduledStartAt.getTime()) {
    return fail("End date and time must be after the start.", 400);
  }

  const client = await prisma.client.findUnique({
    where: { id: parsed.data.clientId },
    select: { id: true },
  });
  if (!client) return fail("Client not found.", 404);

  const programAuditId = cleanNullableString(parsed.data.programAuditId);
  const ownerConsultantId = cleanNullableString(parsed.data.ownerConsultantId);

  const [programAudit, ownerConsultant, optionMaps] = await Promise.all([
    programAuditId
      ? prisma.programAudit.findUnique({
          where: { id: programAuditId },
          select: {
            id: true,
            name: true,
            parameterOptionIds: true,
            documentOptionIds: true,
            floorOptionIds: true,
          },
        })
      : Promise.resolve(null),
    ownerConsultantId
      ? prisma.consultant.findUnique({
          where: { id: ownerConsultantId },
          select: { id: true },
        })
      : Promise.resolve(null),
    programAuditId ? getAuditScheduleOptionMaps() : Promise.resolve(null),
  ]);

  if (programAuditId && !programAudit) return fail("Program audit not found.", 404);
  if (ownerConsultantId && !ownerConsultant) return fail("Assigned consultant not found.", 404);

  const status = normalizeAuditScheduleStatus(AuditScheduleStatus.SCHEDULED, scheduledStartAt);
  const checklistSeed =
    programAudit && optionMaps
      ? buildAuditChecklistSeed(programAudit, optionMaps).map((item) => ({
          source: item.source,
          label: item.label,
          sortOrder: item.sortOrder,
        }))
      : [];

  try {
    const created = await prisma.$transaction(async (tx) => {
      const schedule = await tx.auditSchedule.create({
        data: {
          clientId: parsed.data.clientId,
          programAuditId: programAudit?.id || null,
          title: parsed.data.title.trim(),
          description: cleanNullableString(parsed.data.description),
          status,
          priority: parsed.data.priority,
          mode: parsed.data.mode,
          location: cleanNullableString(parsed.data.location),
          scheduledStartAt,
          scheduledEndAt,
          ownerConsultantId,
          createdByAdminType:
            session.adminType === "consultant"
              ? AuditActorType.CONSULTANT
              : AuditActorType.ENV_ADMIN,
          createdByConsultantId: session.adminType === "consultant" ? session.adminId || null : null,
          createdByNameSnapshot: session.adminName || null,
          followUpAt,
          internalNotes: cleanNullableString(parsed.data.internalNotes),
        },
      });

      if (checklistSeed.length > 0) {
        await tx.auditChecklistItem.createMany({
          data: checklistSeed.map((item) => ({
            auditScheduleId: schedule.id,
            source: item.source,
            label: item.label,
            sortOrder: item.sortOrder,
          })),
        });
      }

      return tx.auditSchedule.findUnique({
        where: { id: schedule.id },
        include: getAuditCalendarScheduleInclude(),
      });
    });

    if (!created) {
      return fail("Failed to create audit schedule.", 500);
    }

    logger.info("audit.calendar.schedule.created", {
      auditScheduleId: created.id,
      clientId: created.clientId,
      programAuditId: created.programAuditId,
    });

    return ok(
      "Audit schedule created",
      {
        schedule: serializeAuditScheduleListItem(created),
      },
      201
    );
  } catch (createError: unknown) {
    logger.error("audit.calendar.schedule.create.error", {
      message: createError instanceof Error ? createError.message : "Unknown create error",
    });
    return fail("Failed to create audit schedule.", 500);
  }
}
