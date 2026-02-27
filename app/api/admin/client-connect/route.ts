import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { addMessage, getMessages, listClientIdsWithChat } from "@/lib/chat-store";

const sendSchema = z.object({
  clientId: z.string().trim().min(1),
  text: z.string().trim().min(1),
});

const querySchema = z.object({
  clientId: z.string().trim().optional(),
});

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    clientId: url.searchParams.get("clientId") || undefined,
  });
  if (!parsed.success) {
    return fail("Invalid query", 400, parsed.error.flatten());
  }

  const clientId = parsed.data.clientId?.trim();
  if (clientId) {
    const messages = await getMessages(clientId);
    return ok("Client chat fetched", { messages });
  }

  const clientIds = await listClientIdsWithChat();
  if (clientIds.length === 0) return ok("No chat threads yet", { threads: [] });

  const clients = await prisma.client.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, name: true, email: true },
  });

  const threads = await Promise.all(
    clients.map(async (client) => {
      const messages = await getMessages(client.id);
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      return {
        client,
        lastMessage,
        messageCount: messages.length,
      };
    })
  );

  threads.sort((a, b) =>
    (b.lastMessage?.createdAt || "").localeCompare(a.lastMessage?.createdAt || "")
  );

  return ok("Threads fetched", { threads });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = sendSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail("clientId and message text are required.", 400, parsed.error.flatten());
  }

  try {
    const message = await addMessage(parsed.data.clientId, "admin", parsed.data.text);
    return ok("Reply sent", { message }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send reply";
    return fail(message, 500);
  }
}
