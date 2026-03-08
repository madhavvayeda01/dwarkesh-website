import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { getClientNotificationFeed } from "@/lib/notification-feed";

const querySchema = z.object({
  filter: z.enum(["all", "unread", "chat", "compliance", "audit"]).optional(),
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(24).optional(),
});

export async function GET(req: Request) {
  const { error, session } = await requireClientModule("notifications");
  if (error || !session) return error;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    filter: url.searchParams.get("filter") || undefined,
    cursor: url.searchParams.get("cursor") || undefined,
    limit: url.searchParams.get("limit") || undefined,
  });
  if (!parsed.success) {
    return fail("Invalid query", 400, parsed.error.flatten());
  }

  const filter = parsed.data.filter === "audit" ? "all" : parsed.data.filter;
  const feed = await getClientNotificationFeed(session, {
    ...parsed.data,
    filter,
  });
  return ok("Notification feed fetched", feed);
}
