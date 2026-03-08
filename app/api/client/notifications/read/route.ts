import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { markClientNotificationRead } from "@/lib/notification-feed";

const bodySchema = z.discriminatedUnion("category", [
  z.object({
    category: z.literal("chat"),
    clientId: z.string().trim().min(1).optional(),
  }),
  z.object({
    category: z.literal("compliance"),
    sourceId: z.string().trim().min(1),
  }),
]);

export async function POST(req: Request) {
  const { error, session } = await requireClientModule("notifications");
  if (error || !session) return error;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail("Invalid notification payload", 400, parsed.error.flatten());
  }

  const payload =
    parsed.data.category === "chat"
      ? { category: "chat" as const, clientId: session.clientId || parsed.data.clientId || "" }
      : parsed.data;

  await markClientNotificationRead(session, payload);
  return ok("Notification marked read", { marked: true });
}
