import { prisma } from "@/lib/prisma";

export type ChatMessage = {
  id: string;
  clientId: string;
  sender: "client" | "admin";
  text: string;
  createdAt: string;
};

function toChatMessage(message: {
  id: string;
  clientId: string;
  sender: "client" | "admin";
  text: string;
  createdAt: Date;
}): ChatMessage {
  return {
    id: message.id,
    clientId: message.clientId,
    sender: message.sender,
    text: message.text,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function listClientIdsWithChat(): Promise<string[]> {
  const rows = await prisma.clientChatMessage.findMany({
    select: { clientId: true },
    distinct: ["clientId"],
  });

  return rows.map((row) => row.clientId);
}

export async function getMessages(clientId: string): Promise<ChatMessage[]> {
  const messages = await prisma.clientChatMessage.findMany({
    where: { clientId },
    orderBy: { createdAt: "asc" },
  });

  return messages.map(toChatMessage);
}

export async function addMessage(
  clientId: string,
  sender: "client" | "admin",
  text: string
): Promise<ChatMessage> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Message text cannot be empty.");
  }

  const message = await prisma.clientChatMessage.create({
    data: {
      clientId,
      sender,
      text: trimmed,
    },
  });

  return toChatMessage(message);
}
