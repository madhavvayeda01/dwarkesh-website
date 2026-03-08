import { NotificationRecipientType, NotificationSourceType, Prisma } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth";
import type {
  MarkNotificationReadPayload,
  NotificationFeedItem,
  NotificationFeedPayload,
  NotificationFilter,
  NotificationSummaryPayload,
} from "@/lib/notification-shared";
import { syncAuditReminderNotices } from "@/lib/audit-calendar";
import { syncComplianceDocumentNotifications } from "@/lib/compliance-notifications";
import { prisma } from "@/lib/prisma";

const DEFAULT_FEED_LIMIT = 12;
const MAX_FEED_LIMIT = 24;
const SUMMARY_ITEM_LIMIT = 8;
const SYNC_WINDOW_MS = 5 * 60 * 1000;

let adminSourceSyncAt = 0;
let adminSourceSyncPromise: Promise<void> | null = null;
const clientSourceSyncAt = new Map<string, number>();
const clientSourceSyncPromises = new Map<string, Promise<void>>();

type RecipientContext = {
  role: "admin" | "client";
  recipientType: NotificationRecipientType;
  recipientId: string;
  clientId?: string;
};

type AdminChatFeedRow = {
  clientId: string;
  clientName: string;
  messageId: string;
  text: string;
  createdAt: Date;
  unreadCount: number;
};

type AdminChatSummaryRow = {
  unreadCount: number | null;
  latestAt: Date | null;
};

type ClientChatSnapshot = {
  unreadCount: number;
  latestAt: Date | null;
  item: NotificationFeedItem | null;
};

function normalizeLimit(limit?: number) {
  if (!Number.isFinite(limit)) return DEFAULT_FEED_LIMIT;
  return Math.min(Math.max(Math.trunc(limit || DEFAULT_FEED_LIMIT), 1), MAX_FEED_LIMIT);
}

function parseCursor(cursor?: string | null) {
  if (!cursor) return null;
  const parsed = new Date(cursor);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function compareItemsDesc(a: NotificationFeedItem, b: NotificationFeedItem) {
  return b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
}

function maxIso(...values: Array<string | null>) {
  return values.filter(Boolean).sort((a, b) => b!.localeCompare(a!))[0] || null;
}

function getFeedHref(role: "admin" | "client", category: "chat" | "compliance" | "audit", clientId?: string) {
  if (category === "chat") {
    return role === "admin" && clientId
      ? `/admin/client-connect?clientId=${encodeURIComponent(clientId)}`
      : "/client/chat";
  }

  if (category === "audit") {
    return "/admin/audit/calendar";
  }

  return role === "admin" ? "/admin/compliance/legal-docs" : "/client/compliance/legal-docs";
}

function getAdminRecipient(session: SessionPayload): RecipientContext {
  return {
    role: "admin",
    recipientType: NotificationRecipientType.ADMIN,
    recipientId:
      session.adminType === "consultant" && session.adminId ? session.adminId : "env-admin",
  };
}

function getClientRecipient(session: SessionPayload): RecipientContext {
  return {
    role: "client",
    recipientType: NotificationRecipientType.CLIENT,
    recipientId: session.clientId || session.sub,
    clientId: session.clientId,
  };
}

async function maybeSyncAdminSources(force = false) {
  const now = Date.now();
  if (!force && now - adminSourceSyncAt < SYNC_WINDOW_MS) return;
  if (!adminSourceSyncPromise) {
    adminSourceSyncPromise = Promise.allSettled([
      syncComplianceDocumentNotifications(),
      syncAuditReminderNotices(),
    ])
      .then(() => {
        adminSourceSyncAt = Date.now();
      })
      .finally(() => {
        adminSourceSyncPromise = null;
      });
  }
  await adminSourceSyncPromise;
}

async function maybeSyncClientSources(clientId: string, force = false) {
  const now = Date.now();
  const lastSync = clientSourceSyncAt.get(clientId) || 0;
  if (!force && now - lastSync < SYNC_WINDOW_MS) return;
  const activePromise = clientSourceSyncPromises.get(clientId);
  if (activePromise) {
    await activePromise;
    return;
  }

  const nextPromise = syncComplianceDocumentNotifications(clientId)
    .then(() => {
      clientSourceSyncAt.set(clientId, Date.now());
    })
    .finally(() => {
      clientSourceSyncPromises.delete(clientId);
    });

  clientSourceSyncPromises.set(clientId, nextPromise);
  await nextPromise;
}

async function loadReadStateSourceIds(
  recipient: RecipientContext,
  sourceType: NotificationSourceType,
  sourceIds: string[]
) {
  if (sourceIds.length === 0) return new Set<string>();

  const rows = await prisma.notificationReadState.findMany({
    where: {
      recipientType: recipient.recipientType,
      recipientId: recipient.recipientId,
      sourceType,
      sourceId: { in: sourceIds },
    },
    select: {
      sourceId: true,
    },
  });

  return new Set(rows.map((row) => row.sourceId));
}

async function listReadSourceIds(recipient: RecipientContext, sourceType: NotificationSourceType) {
  const rows = await prisma.notificationReadState.findMany({
    where: {
      recipientType: recipient.recipientType,
      recipientId: recipient.recipientId,
      sourceType,
    },
    select: {
      sourceId: true,
    },
  });

  return rows.map((row) => row.sourceId);
}

async function listAdminChatRows(
  recipientId: string,
  createdBefore: Date | null,
  take: number
) {
  const createdBeforeClause = createdBefore
    ? Prisma.sql`AND msg."createdAt" < ${createdBefore}`
    : Prisma.empty;

  return prisma.$queryRaw<AdminChatFeedRow[]>`
    SELECT
      client."id" AS "clientId",
      client."name" AS "clientName",
      latest."id" AS "messageId",
      latest."text" AS "text",
      latest."createdAt" AS "createdAt",
      COALESCE(unread."count", 0)::int AS "unreadCount"
    FROM "Client" AS client
    JOIN LATERAL (
      SELECT msg."id", msg."text", msg."createdAt"
      FROM "ClientChatMessage" AS msg
      WHERE msg."clientId" = client."id"
        AND msg."sender" = 'client'
        ${createdBeforeClause}
      ORDER BY msg."createdAt" DESC
      LIMIT 1
    ) AS latest ON TRUE
    LEFT JOIN "ChatThreadReadState" AS read_state
      ON read_state."recipientType" = 'ADMIN'
     AND read_state."recipientId" = ${recipientId}
     AND read_state."clientId" = client."id"
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS "count"
      FROM "ClientChatMessage" AS unread_msg
      WHERE unread_msg."clientId" = client."id"
        AND unread_msg."sender" = 'client'
        AND (
          read_state."lastReadAt" IS NULL
          OR unread_msg."createdAt" > read_state."lastReadAt"
        )
    ) AS unread ON TRUE
    ORDER BY latest."createdAt" DESC
    LIMIT ${take}
  `;
}

async function getAdminChatSummary(recipientId: string) {
  const rows = await prisma.$queryRaw<AdminChatSummaryRow[]>`
    SELECT
      COALESCE(SUM(COALESCE(unread."count", 0)), 0)::int AS "unreadCount",
      MAX(latest."createdAt") AS "latestAt"
    FROM "Client" AS client
    JOIN LATERAL (
      SELECT msg."createdAt"
      FROM "ClientChatMessage" AS msg
      WHERE msg."clientId" = client."id"
        AND msg."sender" = 'client'
      ORDER BY msg."createdAt" DESC
      LIMIT 1
    ) AS latest ON TRUE
    LEFT JOIN "ChatThreadReadState" AS read_state
      ON read_state."recipientType" = 'ADMIN'
     AND read_state."recipientId" = ${recipientId}
     AND read_state."clientId" = client."id"
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS "count"
      FROM "ClientChatMessage" AS unread_msg
      WHERE unread_msg."clientId" = client."id"
        AND unread_msg."sender" = 'client'
        AND (
          read_state."lastReadAt" IS NULL
          OR unread_msg."createdAt" > read_state."lastReadAt"
        )
    ) AS unread ON TRUE
  `;

  return rows[0] || { unreadCount: 0, latestAt: null };
}

function mapAdminChatRowsToItems(rows: AdminChatFeedRow[]): NotificationFeedItem[] {
  return rows.map((row) => ({
    id: `chat:${row.clientId}`,
    category: "chat",
    sourceId: row.clientId,
    createdAt: row.createdAt.toISOString(),
    unread: row.unreadCount > 0,
    title:
      row.unreadCount > 1
        ? `${row.clientName} sent ${row.unreadCount} new messages`
        : `${row.clientName} sent a new message`,
    body: row.text,
    href: getFeedHref("admin", "chat", row.clientId),
    actionLabel: "Open chat",
    accent: "blue",
    meta: row.unreadCount > 1 ? `${row.unreadCount} unread messages` : "Chat update",
    client: {
      id: row.clientId,
      name: row.clientName,
    },
    unreadCount: row.unreadCount,
  }));
}

async function getClientChatSnapshot(
  recipient: RecipientContext,
  createdBefore: Date | null
): Promise<ClientChatSnapshot> {
  if (!recipient.clientId) {
    return { unreadCount: 0, latestAt: null, item: null };
  }

  const readState = await prisma.chatThreadReadState.findUnique({
    where: {
      recipientType_recipientId_clientId: {
        recipientType: recipient.recipientType,
        recipientId: recipient.recipientId,
        clientId: recipient.clientId,
      },
    },
    select: {
      lastReadAt: true,
    },
  });

  const latestMessage = await prisma.clientChatMessage.findFirst({
    where: {
      clientId: recipient.clientId,
      sender: "admin",
      ...(createdBefore ? { createdAt: { lt: createdBefore } } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      text: true,
      createdAt: true,
      client: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const unreadCount = await prisma.clientChatMessage.count({
    where: {
      clientId: recipient.clientId,
      sender: "admin",
      ...(readState?.lastReadAt ? { createdAt: { gt: readState.lastReadAt } } : {}),
    },
  });

  if (!latestMessage) {
    return {
      unreadCount,
      latestAt: null,
      item: null,
    };
  }

  return {
    unreadCount,
    latestAt: latestMessage.createdAt,
    item: {
      id: `chat:${recipient.clientId}`,
      category: "chat",
      sourceId: recipient.clientId,
      createdAt: latestMessage.createdAt.toISOString(),
      unread: unreadCount > 0,
      title:
        unreadCount > 1
          ? `Dwarkesh Consultancy sent ${unreadCount} new messages`
          : "Dwarkesh Consultancy sent a new message",
      body: latestMessage.text,
      href: getFeedHref("client", "chat"),
      actionLabel: "Open chat",
      accent: "blue",
      meta: unreadCount > 1 ? `${unreadCount} unread messages` : "Chat update",
      client: latestMessage.client,
      unreadCount,
    },
  };
}

async function listComplianceItems(
  recipient: RecipientContext,
  createdBefore: Date | null,
  take: number
) {
  return prisma.complianceNotification.findMany({
    where: {
      audience: recipient.role === "admin" ? "ADMIN" : "CLIENT",
      ...(recipient.clientId ? { clientId: recipient.clientId } : {}),
      ...(createdBefore ? { createdAt: { lt: createdBefore } } : {}),
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
        },
      },
      document: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
  });
}

function mapComplianceItems(
  recipient: RecipientContext,
  rows: Awaited<ReturnType<typeof listComplianceItems>>,
  readIds: Set<string>
) {
  return rows.map<NotificationFeedItem>((row) => ({
    id: `compliance:${row.id}`,
    category: "compliance",
    sourceId: row.id,
    createdAt: row.createdAt.toISOString(),
    unread: !readIds.has(row.id),
    title: row.title,
    body: row.message,
    href: getFeedHref(recipient.role, "compliance"),
    actionLabel: "Open legal docs",
    accent:
      row.kind === "EXPIRED" || row.kind === "EXPIRY_1_DAY"
        ? "rose"
        : row.kind === "EXPIRY_7_DAYS"
        ? "amber"
        : "emerald",
    meta: row.document.name,
    client: row.client,
  }));
}

async function listAuditItems(createdBefore: Date | null, take: number) {
  return prisma.auditReminderNotice.findMany({
    where: createdBefore ? { createdAt: { lt: createdBefore } } : undefined,
    include: {
      auditSchedule: {
        select: {
          id: true,
          title: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      visit: {
        select: {
          title: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
  });
}

function mapAuditItems(
  rows: Awaited<ReturnType<typeof listAuditItems>>,
  readIds: Set<string>
) {
  return rows.map<NotificationFeedItem>((row) => ({
    id: `audit:${row.id}`,
    category: "audit",
    sourceId: row.id,
    createdAt: row.createdAt.toISOString(),
    unread: !readIds.has(row.id),
    title: row.title,
    body: row.message,
    href: getFeedHref("admin", "audit"),
    actionLabel: "Open audit calendar",
    accent:
      row.kind === "AUDIT_OVERDUE" || row.kind === "VISIT_OVERDUE"
        ? "rose"
        : row.kind === "AUDIT_2H" || row.kind === "VISIT_2H"
        ? "amber"
        : "emerald",
    meta: row.visit?.title || row.auditSchedule.title,
    client: row.auditSchedule.client,
  }));
}

async function countUnreadCompliance(recipient: RecipientContext) {
  const readIds = await listReadSourceIds(recipient, NotificationSourceType.COMPLIANCE);
  return prisma.complianceNotification.count({
    where: {
      audience: recipient.role === "admin" ? "ADMIN" : "CLIENT",
      ...(recipient.clientId ? { clientId: recipient.clientId } : {}),
      ...(readIds.length > 0 ? { id: { notIn: readIds } } : {}),
    },
  });
}

async function countUnreadAudit(recipient: RecipientContext) {
  const readIds = await listReadSourceIds(recipient, NotificationSourceType.AUDIT);
  return prisma.auditReminderNotice.count({
    where: readIds.length > 0 ? { id: { notIn: readIds } } : undefined,
  });
}

async function getLatestComplianceAt(recipient: RecipientContext) {
  const row = await prisma.complianceNotification.findFirst({
    where: {
      audience: recipient.role === "admin" ? "ADMIN" : "CLIENT",
      ...(recipient.clientId ? { clientId: recipient.clientId } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      createdAt: true,
    },
  });

  return toIso(row?.createdAt);
}

async function getLatestAuditAt() {
  const row = await prisma.auditReminderNotice.findFirst({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      createdAt: true,
    },
  });

  return toIso(row?.createdAt);
}

function applyFilter(items: NotificationFeedItem[], filter: NotificationFilter) {
  if (filter === "all") return items;
  if (filter === "unread") return items.filter((item) => item.unread);
  return items.filter((item) => item.category === filter);
}

async function buildAdminNotificationData(
  session: SessionPayload,
  options?: {
    filter?: NotificationFilter;
    cursor?: string | null;
    limit?: number;
    sync?: boolean;
  }
): Promise<NotificationFeedPayload> {
  const recipient = getAdminRecipient(session);
  if (options?.sync !== false) {
    await maybeSyncAdminSources();
  }

  const filter = options?.filter || "all";
  const limit = normalizeLimit(options?.limit);
  const createdBefore = parseCursor(options?.cursor);
  const sourceTake = Math.max(limit * 4, 20);

  const [chatRows, complianceRows, auditRows] = await Promise.all([
    filter === "compliance" || filter === "audit" ? [] : listAdminChatRows(recipient.recipientId, createdBefore, sourceTake),
    filter === "chat" || filter === "audit"
      ? []
      : listComplianceItems(recipient, createdBefore, sourceTake),
    filter === "chat" || filter === "compliance"
      ? []
      : listAuditItems(createdBefore, sourceTake),
  ]);

  const [complianceReadIds, auditReadIds, chatSummary, unreadComplianceCount, unreadAuditCount, latestComplianceAt, latestAuditAt] =
    await Promise.all([
      complianceRows.length > 0
        ? loadReadStateSourceIds(
            recipient,
            NotificationSourceType.COMPLIANCE,
            complianceRows.map((row) => row.id)
          )
        : Promise.resolve<Set<string>>(new Set<string>()),
      auditRows.length > 0
        ? loadReadStateSourceIds(
            recipient,
            NotificationSourceType.AUDIT,
            auditRows.map((row) => row.id)
          )
        : Promise.resolve<Set<string>>(new Set<string>()),
      getAdminChatSummary(recipient.recipientId),
      countUnreadCompliance(recipient),
      countUnreadAudit(recipient),
      getLatestComplianceAt(recipient),
      getLatestAuditAt(),
    ]);

  const items = applyFilter(
    [
      ...mapAdminChatRowsToItems(chatRows),
      ...mapComplianceItems(recipient, complianceRows, complianceReadIds),
      ...mapAuditItems(auditRows, auditReadIds),
    ].sort(compareItemsDesc),
    filter
  );

  return {
    unreadCount: Number(chatSummary.unreadCount || 0) + unreadComplianceCount + unreadAuditCount,
    latestAt: maxIso(toIso(chatSummary.latestAt), latestComplianceAt, latestAuditAt),
    items: items.slice(0, limit),
    nextCursor: items.length > limit ? items[limit - 1]?.createdAt || null : null,
  };
}

async function buildClientNotificationData(
  session: SessionPayload,
  options?: {
    filter?: NotificationFilter;
    cursor?: string | null;
    limit?: number;
    sync?: boolean;
  }
): Promise<NotificationFeedPayload> {
  const recipient = getClientRecipient(session);
  if (recipient.clientId && options?.sync !== false) {
    await maybeSyncClientSources(recipient.clientId);
  }

  const filter = options?.filter || "all";
  const limit = normalizeLimit(options?.limit);
  const createdBefore = parseCursor(options?.cursor);
  const sourceTake = Math.max(limit * 4, 20);

  const [chatSnapshot, complianceRows] = await Promise.all([
    filter === "compliance" ? Promise.resolve({ unreadCount: 0, latestAt: null, item: null }) : getClientChatSnapshot(recipient, createdBefore),
    filter === "chat" ? [] : listComplianceItems(recipient, createdBefore, sourceTake),
  ]);

  const [complianceReadIds, unreadComplianceCount, latestComplianceAt] = await Promise.all([
    complianceRows.length > 0
      ? loadReadStateSourceIds(
          recipient,
          NotificationSourceType.COMPLIANCE,
          complianceRows.map((row) => row.id)
        )
      : Promise.resolve<Set<string>>(new Set<string>()),
    countUnreadCompliance(recipient),
    getLatestComplianceAt(recipient),
  ]);

  const items = applyFilter(
    [
      ...(chatSnapshot.item ? [chatSnapshot.item] : []),
      ...mapComplianceItems(recipient, complianceRows, complianceReadIds),
    ].sort(compareItemsDesc),
    filter
  );

  return {
    unreadCount: chatSnapshot.unreadCount + unreadComplianceCount,
    latestAt: maxIso(toIso(chatSnapshot.latestAt), latestComplianceAt),
    items: items.slice(0, limit),
    nextCursor: items.length > limit ? items[limit - 1]?.createdAt || null : null,
  };
}

export async function getAdminNotificationSummary(session: SessionPayload): Promise<NotificationSummaryPayload> {
  const payload = await buildAdminNotificationData(session, {
    filter: "all",
    limit: SUMMARY_ITEM_LIMIT,
  });

  return {
    unreadCount: payload.unreadCount,
    latestAt: payload.latestAt,
    items: payload.items,
  };
}

export async function getClientNotificationSummary(session: SessionPayload): Promise<NotificationSummaryPayload> {
  const payload = await buildClientNotificationData(session, {
    filter: "all",
    limit: SUMMARY_ITEM_LIMIT,
  });

  return {
    unreadCount: payload.unreadCount,
    latestAt: payload.latestAt,
    items: payload.items,
  };
}

export async function getAdminNotificationFeed(
  session: SessionPayload,
  options?: {
    filter?: NotificationFilter;
    cursor?: string | null;
    limit?: number;
  }
) {
  return buildAdminNotificationData(session, options);
}

export async function getClientNotificationFeed(
  session: SessionPayload,
  options?: {
    filter?: NotificationFilter;
    cursor?: string | null;
    limit?: number;
  }
) {
  return buildClientNotificationData(session, options);
}

async function markNotificationSourceRead(
  recipient: RecipientContext,
  sourceType: NotificationSourceType,
  sourceId: string
) {
  await prisma.notificationReadState.upsert({
    where: {
      recipientType_recipientId_sourceType_sourceId: {
        recipientType: recipient.recipientType,
        recipientId: recipient.recipientId,
        sourceType,
        sourceId,
      },
    },
    update: {
      readAt: new Date(),
    },
    create: {
      recipientType: recipient.recipientType,
      recipientId: recipient.recipientId,
      sourceType,
      sourceId,
      readAt: new Date(),
    },
  });
}

async function markThreadRead(recipient: RecipientContext, clientId: string, sender: "admin" | "client") {
  const latestMessage = await prisma.clientChatMessage.findFirst({
    where: {
      clientId,
      sender,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      createdAt: true,
    },
  });

  await prisma.chatThreadReadState.upsert({
    where: {
      recipientType_recipientId_clientId: {
        recipientType: recipient.recipientType,
        recipientId: recipient.recipientId,
        clientId,
      },
    },
    update: {
      lastReadAt: latestMessage?.createdAt || new Date(),
    },
    create: {
      recipientType: recipient.recipientType,
      recipientId: recipient.recipientId,
      clientId,
      lastReadAt: latestMessage?.createdAt || new Date(),
    },
  });
}

export async function markAdminNotificationRead(
  session: SessionPayload,
  payload: MarkNotificationReadPayload
) {
  const recipient = getAdminRecipient(session);
  if (payload.category === "chat") {
    await markThreadRead(recipient, payload.clientId, "client");
    return;
  }

  const sourceId = "sourceId" in payload ? payload.sourceId : null;
  if (!sourceId) return;

  await markNotificationSourceRead(
    recipient,
    payload.category === "audit" ? NotificationSourceType.AUDIT : NotificationSourceType.COMPLIANCE,
    sourceId
  );
}

export async function markClientNotificationRead(
  session: SessionPayload,
  payload: Exclude<MarkNotificationReadPayload, { category: "audit"; sourceId: string }>
) {
  const recipient = getClientRecipient(session);
  if (payload.category === "chat" && recipient.clientId) {
    await markThreadRead(recipient, recipient.clientId, "admin");
    return;
  }

  const sourceId = "sourceId" in payload ? payload.sourceId : null;
  if (!sourceId) return;

  await markNotificationSourceRead(recipient, NotificationSourceType.COMPLIANCE, sourceId);
}

async function markAllNotificationSourcesRead(
  recipient: RecipientContext,
  sourceType: NotificationSourceType,
  sourceIds: string[]
) {
  if (sourceIds.length === 0) return;

  const readAt = new Date();
  await prisma.notificationReadState.createMany({
    data: sourceIds.map((sourceId) => ({
      recipientType: recipient.recipientType,
      recipientId: recipient.recipientId,
      sourceType,
      sourceId,
      readAt,
    })),
    skipDuplicates: true,
  });

  await prisma.notificationReadState.updateMany({
    where: {
      recipientType: recipient.recipientType,
      recipientId: recipient.recipientId,
      sourceType,
      sourceId: { in: sourceIds },
    },
    data: {
      readAt,
    },
  });
}

export async function markAllAdminNotificationsRead(session: SessionPayload) {
  const recipient = getAdminRecipient(session);

  const [chatThreads, complianceIds, auditIds] = await Promise.all([
    prisma.clientChatMessage.groupBy({
      by: ["clientId"],
      where: {
        sender: "client",
      },
      _max: {
        createdAt: true,
      },
    }),
    prisma.complianceNotification.findMany({
      where: {
        audience: "ADMIN",
      },
      select: {
        id: true,
      },
    }),
    prisma.auditReminderNotice.findMany({
      select: {
        id: true,
      },
    }),
  ]);

  await Promise.all([
    Promise.all(
      chatThreads.map((thread) => markThreadRead(recipient, thread.clientId, "client"))
    ),
    markAllNotificationSourcesRead(
      recipient,
      NotificationSourceType.COMPLIANCE,
      complianceIds.map((row) => row.id)
    ),
    markAllNotificationSourcesRead(
      recipient,
      NotificationSourceType.AUDIT,
      auditIds.map((row) => row.id)
    ),
  ]);
}

export async function markAllClientNotificationsRead(session: SessionPayload) {
  const recipient = getClientRecipient(session);
  if (!recipient.clientId) return;

  const complianceIds = await prisma.complianceNotification.findMany({
    where: {
      audience: "CLIENT",
      clientId: recipient.clientId,
    },
    select: {
      id: true,
    },
  });

  await Promise.all([
    markThreadRead(recipient, recipient.clientId, "admin"),
    markAllNotificationSourcesRead(
      recipient,
      NotificationSourceType.COMPLIANCE,
      complianceIds.map((row) => row.id)
    ),
  ]);
}

export async function markAdminChatThreadRead(session: SessionPayload, clientId: string) {
  const recipient = getAdminRecipient(session);
  await markThreadRead(recipient, clientId, "client");
}

export async function markClientChatThreadRead(session: SessionPayload) {
  const recipient = getClientRecipient(session);
  if (!recipient.clientId) return;
  await markThreadRead(recipient, recipient.clientId, "admin");
}
