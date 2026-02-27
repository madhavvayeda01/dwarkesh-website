import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type ChatMessage = {
  id: string;
  clientId: string;
  sender: "client" | "admin";
  text: string;
  createdAt: string;
};

function chatDir() {
  return path.join(process.cwd(), "data", "chat");
}

function chatFile(clientId: string) {
  return path.join(chatDir(), `${clientId}.json`);
}

async function ensureDir() {
  await fs.mkdir(chatDir(), { recursive: true });
}

export async function listClientIdsWithChat(): Promise<string[]> {
  await ensureDir();
  const entries = await fs.readdir(chatDir(), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name.replace(/\.json$/i, ""));
}

export async function getMessages(clientId: string): Promise<ChatMessage[]> {
  await ensureDir();
  const file = chatFile(clientId);
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveMessages(clientId: string, messages: ChatMessage[]) {
  await ensureDir();
  const file = chatFile(clientId);
  await fs.writeFile(file, JSON.stringify(messages, null, 2), "utf8");
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

  const messages = await getMessages(clientId);
  const message: ChatMessage = {
    id: randomUUID(),
    clientId,
    sender,
    text: trimmed,
    createdAt: new Date().toISOString(),
  };
  messages.push(message);
  await saveMessages(clientId, messages);
  return message;
}
