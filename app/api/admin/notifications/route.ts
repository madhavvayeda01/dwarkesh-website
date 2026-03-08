import { ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { getAdminNotificationSummary } from "@/lib/notification-feed";

export async function GET() {
  const { error, session } = await requireAdmin();
  if (error || !session) return error;

  const summary = await getAdminNotificationSummary(session);
  return ok("Notifications fetched", summary);
}
