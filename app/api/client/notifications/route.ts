import { ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { getClientNotificationSummary } from "@/lib/notification-feed";

export async function GET() {
  const { error, session } = await requireClientModule("notifications");
  if (error || !session) return error;

  const summary = await getClientNotificationSummary(session);
  return ok("Notifications fetched", summary);
}
