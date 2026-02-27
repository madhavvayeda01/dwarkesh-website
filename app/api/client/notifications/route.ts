import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { getMessages } from "@/lib/chat-store";

const querySchema = z.object({
  since: z.string().datetime().optional(),
});

export async function GET(req: Request) {
  const { error, session } = await requireClientModule("notifications");
  if (error || !session) return error;
  if (!session.clientId) return fail("Unauthorized", 401);

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
  const latestAt =
    adminMessages.length > 0 ? adminMessages[adminMessages.length - 1].createdAt : null;

  return ok("Notifications fetched", {
    unreadCount: unread.length,
    latestAt,
  });
}
