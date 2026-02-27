import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { getMessages, listClientIdsWithChat } from "@/lib/chat-store";

const querySchema = z.object({
  since: z.string().datetime().optional(),
});

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    since: url.searchParams.get("since") || undefined,
  });
  if (!parsed.success) {
    return fail("Invalid query", 400, parsed.error.flatten());
  }

  const since = parsed.data.since ? new Date(parsed.data.since).toISOString() : null;
  const clientIds = await listClientIdsWithChat();

  let unreadCount = 0;
  let latestAt: string | null = null;

  for (const clientId of clientIds) {
    const messages = await getMessages(clientId);
    const clientMessages = messages.filter((message) => message.sender === "client");
    const unread = since
      ? clientMessages.filter((message) => message.createdAt > since)
      : clientMessages;
    unreadCount += unread.length;

    const last = clientMessages.length > 0 ? clientMessages[clientMessages.length - 1] : null;
    if (last?.createdAt && (!latestAt || last.createdAt > latestAt)) {
      latestAt = last.createdAt;
    }
  }

  return ok("Notifications fetched", {
    unreadCount,
    latestAt,
  });
}
