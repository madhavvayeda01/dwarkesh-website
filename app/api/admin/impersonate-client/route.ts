import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, signJwt } from "@/lib/auth";

const bodySchema = z.object({
  clientId: z.string().trim().min(1),
});

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());

  const client = await prisma.client.findUnique({
    where: { id: parsed.data.clientId },
    select: { id: true, name: true },
  });
  if (!client) return fail("Client not found", 404);

  const token = signJwt({
    sub: client.id,
    role: "client",
    clientId: client.id,
    impersonatedByAdmin: true,
  });

  const res = ok("Switched to client session", {
    redirectTo: "/client-dashboard",
    clientId: client.id,
    clientName: client.name,
  });
  setSessionCookie(res as any, token);
  return res;
}
