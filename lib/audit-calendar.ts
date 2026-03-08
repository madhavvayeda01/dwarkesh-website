import {
  AuditChecklistSource,
  AuditReminderEmailStatus,
  AuditReminderKind,
  AuditScheduleStatus,
  AuditVisitStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const ADMIN_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export const AUDIT_SCHEDULE_TERMINAL_STATUSES: AuditScheduleStatus[] = [
  AuditScheduleStatus.COMPLETED,
  AuditScheduleStatus.CANCELLED,
];

export const AUDIT_VISIT_TERMINAL_STATUSES: AuditVisitStatus[] = [
  AuditVisitStatus.DONE,
  AuditVisitStatus.CANCELLED,
];

export const AUDIT_SCHEDULE_MANUAL_STATUSES: AuditScheduleStatus[] = [
  AuditScheduleStatus.DRAFT,
  AuditScheduleStatus.SCHEDULED,
  AuditScheduleStatus.VISIT_PLANNED,
  AuditScheduleStatus.IN_PROGRESS,
  AuditScheduleStatus.COMPLETED,
  AuditScheduleStatus.RESCHEDULED,
  AuditScheduleStatus.CANCELLED,
];

type ChecklistMaps = {
  parameterById: Record<string, string>;
  documentById: Record<string, string>;
  floorById: Record<string, string>;
};

type ScheduleRecipientContext = {
  ownerConsultant?: { email: string; active: boolean } | null;
};

type ReminderSeedInput = {
  auditScheduleId: string;
  visitId?: string | null;
  kind: AuditReminderKind;
  title: string;
  message: string;
  notifyAt: Date;
  recipients: string[];
};

const scheduleListInclude = {
  client: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  programAudit: {
    select: {
      id: true,
      name: true,
    },
  },
  ownerConsultant: {
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
    },
  },
  _count: {
    select: {
      visits: true,
      checklistItems: true,
      attachments: true,
    },
  },
} satisfies Prisma.AuditScheduleInclude;

const scheduleDetailInclude = {
  client: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  programAudit: {
    select: {
      id: true,
      name: true,
    },
  },
  ownerConsultant: {
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
    },
  },
  visits: {
    orderBy: {
      plannedStartAt: "asc",
    },
    include: {
      attachments: {
        orderBy: {
          createdAt: "desc",
        },
      },
      reminderNotices: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  },
  checklistItems: {
    orderBy: [
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
  },
  attachments: {
    orderBy: {
      createdAt: "desc",
    },
  },
  reminderNotices: {
    orderBy: {
      createdAt: "desc",
    },
  },
} satisfies Prisma.AuditScheduleInclude;

type AuditScheduleListRecord = Prisma.AuditScheduleGetPayload<{
  include: typeof scheduleListInclude;
}>;

type AuditScheduleDetailRecord = Prisma.AuditScheduleGetPayload<{
  include: typeof scheduleDetailInclude;
}>;

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function toDateLabel(value: Date | null | undefined) {
  if (!value) return null;
  return value.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isValidEmail(value: string | null | undefined) {
  return !!value && ADMIN_EMAIL_REGEX.test(value.trim());
}

export function safeAuditFilePart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function parseDateTimeInput(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function shouldAuditScheduleBeOverdue(
  status: AuditScheduleStatus,
  scheduledStartAt: Date,
  now = new Date()
) {
  if (AUDIT_SCHEDULE_TERMINAL_STATUSES.includes(status)) return false;
  if (status === AuditScheduleStatus.IN_PROGRESS) return false;
  return scheduledStartAt.getTime() < now.getTime();
}

export function normalizeAuditScheduleStatus(
  status: AuditScheduleStatus,
  scheduledStartAt: Date,
  now = new Date()
) {
  if (status === AuditScheduleStatus.OVERDUE && scheduledStartAt.getTime() >= now.getTime()) {
    return AuditScheduleStatus.SCHEDULED;
  }

  if (shouldAuditScheduleBeOverdue(status, scheduledStartAt, now)) {
    return AuditScheduleStatus.OVERDUE;
  }

  return status;
}

export function buildAuditChecklistSeed(
  programAudit: {
    parameterOptionIds: string[];
    documentOptionIds: string[];
    floorOptionIds: string[];
  },
  maps: ChecklistMaps
) {
  const rows: Array<{
    source: AuditChecklistSource;
    label: string;
    sortOrder: number;
  }> = [];

  const pushGroup = (
    source: AuditChecklistSource,
    ids: string[],
    map: Record<string, string>,
    offset: number
  ) => {
    ids.forEach((id, index) => {
      const label = map[id];
      if (!label) return;
      rows.push({
        source,
        label,
        sortOrder: offset + index,
      });
    });
  };

  pushGroup(AuditChecklistSource.PARAMETER, programAudit.parameterOptionIds, maps.parameterById, 0);
  pushGroup(AuditChecklistSource.DOCUMENT, programAudit.documentOptionIds, maps.documentById, 1000);
  pushGroup(AuditChecklistSource.FLOOR, programAudit.floorOptionIds, maps.floorById, 2000);

  return rows;
}

export function serializeAuditAttachment(
  attachment: AuditScheduleDetailRecord["attachments"][number] | AuditScheduleDetailRecord["visits"][number]["attachments"][number]
) {
  return {
    id: attachment.id,
    auditScheduleId: attachment.auditScheduleId,
    visitId: attachment.visitId,
    fileName: attachment.fileName,
    fileUrl: attachment.fileUrl,
    createdAt: attachment.createdAt.toISOString(),
  };
}

export function serializeAuditChecklistItem(
  item: AuditScheduleDetailRecord["checklistItems"][number]
) {
  return {
    id: item.id,
    auditScheduleId: item.auditScheduleId,
    visitId: item.visitId,
    source: item.source,
    label: item.label,
    details: item.details,
    sortOrder: item.sortOrder,
    completed: item.completed,
    completedAt: toIso(item.completedAt),
    notes: item.notes,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function serializeAuditVisit(
  visit: AuditScheduleDetailRecord["visits"][number]
) {
  return {
    id: visit.id,
    auditScheduleId: visit.auditScheduleId,
    title: visit.title,
    purpose: visit.purpose,
    plannedStartAt: visit.plannedStartAt.toISOString(),
    plannedEndAt: toIso(visit.plannedEndAt),
    plannedLabel: toDateLabel(visit.plannedStartAt),
    location: visit.location,
    contactPerson: visit.contactPerson,
    status: visit.status,
    notes: visit.notes,
    outcome: visit.outcome,
    createdAt: visit.createdAt.toISOString(),
    updatedAt: visit.updatedAt.toISOString(),
    attachments: visit.attachments.map(serializeAuditAttachment),
    reminders: visit.reminderNotices.map((notice) => ({
      id: notice.id,
      kind: notice.kind,
      notifyAt: notice.notifyAt.toISOString(),
      emailStatus: notice.emailStatus,
      createdAt: notice.createdAt.toISOString(),
    })),
  };
}

export function serializeAuditScheduleListItem(schedule: AuditScheduleListRecord) {
  return {
    id: schedule.id,
    client: schedule.client,
    programAudit: schedule.programAudit,
    ownerConsultant: schedule.ownerConsultant,
    title: schedule.title,
    description: schedule.description,
    status: schedule.status,
    priority: schedule.priority,
    mode: schedule.mode,
    location: schedule.location,
    scheduledStartAt: schedule.scheduledStartAt.toISOString(),
    scheduledStartLabel: toDateLabel(schedule.scheduledStartAt),
    scheduledEndAt: toIso(schedule.scheduledEndAt),
    followUpAt: toIso(schedule.followUpAt),
    createdByAdminType: schedule.createdByAdminType,
    createdByConsultantId: schedule.createdByConsultantId,
    createdByNameSnapshot: schedule.createdByNameSnapshot,
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString(),
    counts: {
      visits: schedule._count.visits,
      checklistItems: schedule._count.checklistItems,
      attachments: schedule._count.attachments,
    },
  };
}

export function serializeAuditScheduleDetail(schedule: AuditScheduleDetailRecord) {
  return {
    id: schedule.id,
    client: schedule.client,
    programAudit: schedule.programAudit,
    ownerConsultant: schedule.ownerConsultant,
    title: schedule.title,
    description: schedule.description,
    status: schedule.status,
    priority: schedule.priority,
    mode: schedule.mode,
    location: schedule.location,
    scheduledStartAt: schedule.scheduledStartAt.toISOString(),
    scheduledStartLabel: toDateLabel(schedule.scheduledStartAt),
    scheduledEndAt: toIso(schedule.scheduledEndAt),
    followUpAt: toIso(schedule.followUpAt),
    internalNotes: schedule.internalNotes,
    outcomeSummary: schedule.outcomeSummary,
    createdByAdminType: schedule.createdByAdminType,
    createdByConsultantId: schedule.createdByConsultantId,
    createdByNameSnapshot: schedule.createdByNameSnapshot,
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString(),
    visits: schedule.visits.map(serializeAuditVisit),
    checklistItems: schedule.checklistItems.map(serializeAuditChecklistItem),
    attachments: schedule.attachments.map(serializeAuditAttachment),
    reminders: schedule.reminderNotices.map((notice) => ({
      id: notice.id,
      visitId: notice.visitId,
      kind: notice.kind,
      title: notice.title,
      message: notice.message,
      notifyAt: notice.notifyAt.toISOString(),
      emailTo: notice.emailTo,
      emailStatus: notice.emailStatus,
      emailError: notice.emailError,
      emailSentAt: toIso(notice.emailSentAt),
      createdAt: notice.createdAt.toISOString(),
    })),
  };
}

export async function getAuditScheduleOptionMaps(): Promise<ChecklistMaps> {
  const [parameterOptions, documentOptions, floorOptions] = await Promise.all([
    prisma.auditParameterOption.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.auditDocumentOption.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.auditFloorOption.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    parameterById: Object.fromEntries(parameterOptions.map((item) => [item.id, item.name])),
    documentById: Object.fromEntries(documentOptions.map((item) => [item.id, item.name])),
    floorById: Object.fromEntries(floorOptions.map((item) => [item.id, item.name])),
  };
}

export async function syncAuditScheduleStatuses(now = new Date()) {
  const overdueRows = await prisma.auditSchedule.findMany({
    where: {
      status: {
        in: [
          AuditScheduleStatus.DRAFT,
          AuditScheduleStatus.SCHEDULED,
          AuditScheduleStatus.VISIT_PLANNED,
          AuditScheduleStatus.RESCHEDULED,
        ],
      },
      scheduledStartAt: {
        lt: now,
      },
    },
    select: {
      id: true,
    },
  });

  if (overdueRows.length > 0) {
    await prisma.auditSchedule.updateMany({
      where: {
        id: {
          in: overdueRows.map((row) => row.id),
        },
      },
      data: {
        status: AuditScheduleStatus.OVERDUE,
      },
    });
  }
}

function resolveReminderRecipients({ ownerConsultant }: ScheduleRecipientContext) {
  const recipients = new Set<string>();
  if (ownerConsultant?.active && isValidEmail(ownerConsultant.email)) {
    recipients.add(ownerConsultant.email.trim().toLowerCase());
  }

  const envAdmin = process.env.ADMIN_USERNAME || "";
  if (isValidEmail(envAdmin)) {
    recipients.add(envAdmin.trim().toLowerCase());
  }

  return Array.from(recipients);
}

async function sendAuditReminderEmail(input: {
  title: string;
  message: string;
  recipients: string[];
  notifyAt: Date;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return {
      ok: false,
      skipped: true,
      error: "Audit reminder email provider is not configured.",
    };
  }

  if (input.recipients.length === 0) {
    return {
      ok: false,
      skipped: true,
      error: "No eligible reminder recipients.",
    };
  }

  const notifyLabel = input.notifyAt.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const text = [
    input.title,
    "",
    input.message,
    "",
    `Scheduled for: ${notifyLabel}`,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="margin:0 0 12px">${escapeHtml(input.title)}</h2>
      <p style="margin:0 0 12px">${escapeHtml(input.message)}</p>
      <div style="padding:12px 14px;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc">
        <strong>Scheduled for:</strong> ${escapeHtml(notifyLabel)}
      </div>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.recipients,
      subject: input.title,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown email provider error");
    return {
      ok: false,
      skipped: false,
      error: errorText,
    };
  }

  return {
    ok: true,
    skipped: false,
    error: null,
  };
}

async function ensureReminderNotice(input: ReminderSeedInput) {
  const existing = await prisma.auditReminderNotice.findFirst({
    where: {
      auditScheduleId: input.auditScheduleId,
      visitId: input.visitId ?? null,
      kind: input.kind,
    },
    select: {
      id: true,
    },
  });

  if (existing) return;

  const initialStatus =
    input.recipients.length > 0 && process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL
      ? AuditReminderEmailStatus.PENDING
      : AuditReminderEmailStatus.SKIPPED;

  try {
    const notice = await prisma.auditReminderNotice.create({
      data: {
        auditScheduleId: input.auditScheduleId,
        visitId: input.visitId ?? null,
        kind: input.kind,
        title: input.title,
        message: input.message,
        notifyAt: input.notifyAt,
        emailTo: input.recipients,
        emailStatus: initialStatus,
        emailError:
          initialStatus === AuditReminderEmailStatus.SKIPPED
            ? input.recipients.length === 0
              ? "No eligible reminder recipients."
              : "Audit reminder email provider is not configured."
            : null,
      },
      select: {
        id: true,
      },
    });

    if (initialStatus !== AuditReminderEmailStatus.PENDING) return;

    const sent = await sendAuditReminderEmail({
      title: input.title,
      message: input.message,
      recipients: input.recipients,
      notifyAt: input.notifyAt,
    });

    if (sent.ok) {
      await prisma.auditReminderNotice.update({
        where: { id: notice.id },
        data: {
          emailStatus: AuditReminderEmailStatus.SENT,
          emailSentAt: new Date(),
          emailError: null,
        },
      });
      return;
    }

    await prisma.auditReminderNotice.update({
      where: { id: notice.id },
      data: {
        emailStatus: sent.skipped
          ? AuditReminderEmailStatus.SKIPPED
          : AuditReminderEmailStatus.FAILED,
        emailError: sent.error?.slice(0, 500) || null,
      },
    });
  } catch (error: unknown) {
    const prismaError = error as { code?: string; message?: string };
    if (prismaError?.code === "P2002") return;
    logger.error("audit.reminder.create.error", {
      auditScheduleId: input.auditScheduleId,
      visitId: input.visitId ?? null,
      kind: input.kind,
      message: prismaError?.message || "Unknown reminder create failure",
    });
  }
}

export async function syncAuditReminderNotices(now = new Date()) {
  await syncAuditScheduleStatuses(now);

  const schedules = await prisma.auditSchedule.findMany({
    where: {
      status: {
        notIn: AUDIT_SCHEDULE_TERMINAL_STATUSES,
      },
    },
    select: {
      id: true,
      title: true,
      status: true,
      scheduledStartAt: true,
      client: {
        select: {
          name: true,
        },
      },
      ownerConsultant: {
        select: {
          email: true,
          active: true,
        },
      },
    },
  });

  for (const schedule of schedules) {
    const diffMs = schedule.scheduledStartAt.getTime() - now.getTime();
    const recipients = resolveReminderRecipients({
      ownerConsultant: schedule.ownerConsultant,
    });
    const baseTitle = `Audit reminder: ${schedule.title}`;
    const clientName = schedule.client.name || "Selected client";

    if (diffMs <= DAY_MS && diffMs >= 0) {
      await ensureReminderNotice({
        auditScheduleId: schedule.id,
        kind: AuditReminderKind.AUDIT_24H,
        title: baseTitle,
        message: `${schedule.title} for ${clientName} is due within 24 hours.`,
        notifyAt: schedule.scheduledStartAt,
        recipients,
      });
    }

    if (diffMs <= 2 * HOUR_MS && diffMs >= 0) {
      await ensureReminderNotice({
        auditScheduleId: schedule.id,
        kind: AuditReminderKind.AUDIT_2H,
        title: baseTitle,
        message: `${schedule.title} for ${clientName} is due within 2 hours.`,
        notifyAt: schedule.scheduledStartAt,
        recipients,
      });
    }

    if (diffMs < 0) {
      await ensureReminderNotice({
        auditScheduleId: schedule.id,
        kind: AuditReminderKind.AUDIT_OVERDUE,
        title: `Audit overdue: ${schedule.title}`,
        message: `${schedule.title} for ${clientName} is overdue and still needs action.`,
        notifyAt: now,
        recipients,
      });
    }
  }

  const visits = await prisma.auditVisit.findMany({
    where: {
      status: {
        notIn: AUDIT_VISIT_TERMINAL_STATUSES,
      },
      auditSchedule: {
        status: {
          notIn: AUDIT_SCHEDULE_TERMINAL_STATUSES,
        },
      },
    },
    select: {
      id: true,
      title: true,
      status: true,
      plannedStartAt: true,
      auditSchedule: {
        select: {
          id: true,
          title: true,
          client: {
            select: {
              name: true,
            },
          },
          ownerConsultant: {
            select: {
              email: true,
              active: true,
            },
          },
        },
      },
    },
  });

  for (const visit of visits) {
    const diffMs = visit.plannedStartAt.getTime() - now.getTime();
    const recipients = resolveReminderRecipients({
      ownerConsultant: visit.auditSchedule.ownerConsultant,
    });
    const baseTitle = `Visit reminder: ${visit.title}`;
    const clientName = visit.auditSchedule.client.name || "Selected client";

    if (diffMs <= DAY_MS && diffMs >= 0) {
      await ensureReminderNotice({
        auditScheduleId: visit.auditSchedule.id,
        visitId: visit.id,
        kind: AuditReminderKind.VISIT_24H,
        title: baseTitle,
        message: `Visit "${visit.title}" for audit ${visit.auditSchedule.title} (${clientName}) is due within 24 hours.`,
        notifyAt: visit.plannedStartAt,
        recipients,
      });
    }

    if (diffMs <= 2 * HOUR_MS && diffMs >= 0) {
      await ensureReminderNotice({
        auditScheduleId: visit.auditSchedule.id,
        visitId: visit.id,
        kind: AuditReminderKind.VISIT_2H,
        title: baseTitle,
        message: `Visit "${visit.title}" for audit ${visit.auditSchedule.title} (${clientName}) is due within 2 hours.`,
        notifyAt: visit.plannedStartAt,
        recipients,
      });
    }

    if (diffMs < 0) {
      await ensureReminderNotice({
        auditScheduleId: visit.auditSchedule.id,
        visitId: visit.id,
        kind: AuditReminderKind.VISIT_OVERDUE,
        title: `Visit overdue: ${visit.title}`,
        message: `Visit "${visit.title}" for audit ${visit.auditSchedule.title} (${clientName}) is overdue and still needs action.`,
        notifyAt: now,
        recipients,
      });
    }
  }
}

export async function getAuditCalendarSummary(now = new Date()) {
  await syncAuditScheduleStatuses(now);

  const todayStart = startOfToday();
  const tomorrowStart = new Date(todayStart.getTime() + DAY_MS);
  const upcomingCutoff = new Date(now.getTime() + 7 * DAY_MS);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [todayCount, upcomingCount, overdueCount, completedThisMonth] = await Promise.all([
    prisma.auditSchedule.count({
      where: {
        scheduledStartAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
    }),
    prisma.auditSchedule.count({
      where: {
        scheduledStartAt: {
          gte: now,
          lte: upcomingCutoff,
        },
        status: {
          notIn: AUDIT_SCHEDULE_TERMINAL_STATUSES,
        },
      },
    }),
    prisma.auditSchedule.count({
      where: {
        status: AuditScheduleStatus.OVERDUE,
      },
    }),
    prisma.auditSchedule.count({
      where: {
        status: AuditScheduleStatus.COMPLETED,
        scheduledStartAt: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
    }),
  ]);

  return {
    today: todayCount,
    upcoming7Days: upcomingCount,
    overdue: overdueCount,
    completedThisMonth,
  };
}

export function getAuditCalendarScheduleInclude() {
  return scheduleListInclude;
}

export function getAuditCalendarScheduleDetailInclude() {
  return scheduleDetailInclude;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
