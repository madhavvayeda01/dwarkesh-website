import { ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { markAllAdminNotificationsRead } from "@/lib/notification-feed";

export async function POST() {
  const { error, session } = await requireAdmin();
  if (error || !session) return error;

  await markAllAdminNotificationsRead(session);
  return ok("All notifications marked read", { marked: true });
}
