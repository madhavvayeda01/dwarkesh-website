import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { getMessages } from "@/lib/chat-store";
import { prisma } from "@/lib/prisma";
import { syncComplianceDocumentNotifications } from "@/lib/compliance-notifications";

const querySchema = z.object({
  since: z.string().datetime().optional(),
});

export async function GET(req: Request) {
  const { error, session } = await requireClientModule("notifications");
  if (error || !session) return error;
  if (!session.clientId) return fail("Unauthorized", 401);

  await syncComplianceDocumentNotifications(session.clientId);

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    since: url.searchParams.get("since") || undefined,
  });
  if (!parsed.success) {
    return fail("Invalid query", 400, parsed.error.flatten());
  }

  const since = parsed.data.since ? new Date(parsed.data.since).toISOString() : null;
  const messages = await getMessages(session.clientId);
  const adminMessages = messages.filter((message) => message.sender === "admin");
  const unread = since
    ? adminMessages.filter((message) => message.createdAt > since)
    : adminMessages;
  let unreadCount = unread.length;
  let latestAt =
    adminMessages.length > 0 ? adminMessages[adminMessages.length - 1].createdAt : null;

  const legalDocNotifications = await prisma.complianceNotification.findMany({
    where: {
      clientId: session.clientId,
      audience: "CLIENT",
    },
    select: {
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  unreadCount += since
    ? legalDocNotifications.filter((item) => item.createdAt.toISOString() > since).length
    : legalDocNotifications.length;

  const latestLegalDoc = legalDocNotifications[0]?.createdAt?.toISOString() || null;
  if (latestLegalDoc && (!latestAt || latestLegalDoc > latestAt)) {
    latestAt = latestLegalDoc;
  }

  return ok("Notifications fetched", {
    unreadCount,
    latestAt,
  });
}
