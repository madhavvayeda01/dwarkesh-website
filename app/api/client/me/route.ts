import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client" || !session.clientId) {
    return fail("Not authenticated", 401, { loggedIn: false });
  }

  const client = await prisma.client.findUnique({
    where: { id: session.clientId },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  if (!client) {
    return fail("Client account not found", 401, { loggedIn: false });
  }

  return ok("Authenticated", { loggedIn: true, client });
}
