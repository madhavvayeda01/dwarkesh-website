import { ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { markAllClientNotificationsRead } from "@/lib/notification-feed";

export async function POST() {
  const { error, session } = await requireClientModule("notifications");
  if (error || !session) return error;

  await markAllClientNotificationsRead(session);
  return ok("All notifications marked read", { marked: true });
}
