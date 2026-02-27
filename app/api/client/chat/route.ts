import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { addMessage, getMessages } from "@/lib/chat-store";

const sendSchema = z.object({
  text: z.string().trim().min(1),
});

export async function GET() {
  const { error, session } = await requireClientModule("chat");
  if (error || !session) return error;
  if (!session.clientId) return fail("Unauthorized", 401);

  const messages = await getMessages(session.clientId);
  return ok("Chat messages fetched", { messages });
}

export async function POST(req: Request) {
  const { error, session } = await requireClientModule("chat");
  if (error || !session) return error;
  if (!session.clientId) return fail("Unauthorized", 401);

  const parsed = sendSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail("Message text is required.", 400, parsed.error.flatten());
  }

  try {
    const message = await addMessage(session.clientId, "client", parsed.data.text);
    return ok("Message sent", { message }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send message";
    return fail(message, 500);
  }
}
