import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

const COMPLIANCE_NOTIFICATION_RULES = [
  { kind: "EXPIRY_30_DAYS" as const, daysBefore: 30, label: "expiring in 30 days" },
  { kind: "EXPIRY_7_DAYS" as const, daysBefore: 7, label: "expiring in 7 days" },
  { kind: "EXPIRY_1_DAY" as const, daysBefore: 1, label: "expiring tomorrow" },
  { kind: "EXPIRED" as const, daysBefore: 0, label: "has expired" },
];

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function syncComplianceDocumentNotifications(clientId?: string) {
  const today = startOfToday();

  const documents = await prisma.complianceLegalDocument.findMany({
    where: {
      ...(clientId ? { clientId } : {}),
    },
    include: {
      client: {
        select: { id: true, name: true },
      },
    },
  });

  const desiredKeys = new Set<string>();

  for (const document of documents) {
    const expiryStart = new Date(
      document.expiryDate.getFullYear(),
      document.expiryDate.getMonth(),
      document.expiryDate.getDate()
    );
    const diffDays = Math.floor((expiryStart.getTime() - today.getTime()) / DAY_MS);

    for (const rule of COMPLIANCE_NOTIFICATION_RULES) {
      const shouldNotify =
        rule.kind === "EXPIRED" ? diffDays < 0 : diffDays <= rule.daysBefore && diffDays >= 0;

      if (!shouldNotify) continue;

      const message =
        rule.kind === "EXPIRED"
          ? `${document.name} for ${document.client.name} has expired.`
          : `${document.name} for ${document.client.name} is ${rule.label}.`;

      for (const audience of ["ADMIN", "CLIENT"] as const) {
        desiredKeys.add(`${document.id}:${audience}:${rule.kind}`);
        await prisma.complianceNotification.upsert({
          where: {
            documentId_audience_kind: {
              documentId: document.id,
              audience,
              kind: rule.kind,
            },
          },
          update: {},
          create: {
            clientId: document.clientId,
            documentId: document.id,
            audience,
            kind: rule.kind,
            notifyAt: today,
            title: "Legal document expiry",
            message,
          },
        });
      }
    }
  }

  const existingNotifications = await prisma.complianceNotification.findMany({
    where: {
      ...(clientId ? { clientId } : {}),
    },
    select: {
      id: true,
      documentId: true,
      audience: true,
      kind: true,
    },
  });

  const staleNotificationIds = existingNotifications
    .filter((item) => !desiredKeys.has(`${item.documentId}:${item.audience}:${item.kind}`))
    .map((item) => item.id);

  if (staleNotificationIds.length > 0) {
    await prisma.complianceNotification.deleteMany({
      where: { id: { in: staleNotificationIds } },
    });
  }
}
