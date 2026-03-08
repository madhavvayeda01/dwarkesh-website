import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { markAdminNotificationRead } from "@/lib/notification-feed";

const bodySchema = z.discriminatedUnion("category", [
  z.object({
    category: z.literal("chat"),
    clientId: z.string().trim().min(1),
  }),
  z.object({
    category: z.literal("compliance"),
    sourceId: z.string().trim().min(1),
  }),
  z.object({
    category: z.literal("audit"),
    sourceId: z.string().trim().min(1),
  }),
]);

export async function POST(req: Request) {
  const { error, session } = await requireAdmin();
  if (error || !session) return error;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail("Invalid notification payload", 400, parsed.error.flatten());
  }

  await markAdminNotificationRead(session, parsed.data);
  return ok("Notification marked read", { marked: true });
}
