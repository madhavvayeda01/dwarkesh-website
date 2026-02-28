import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { getSessionFromCookies } from "@/lib/auth";
import { z } from "zod";

const updateClientSchema = z.object({
  name: z.string().trim().min(1),
  logoUrl: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  contactNumber: z.string().trim().optional().or(z.literal("")),
});

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client" || !session.clientId) {
    return fail("Not authenticated", 401, { loggedIn: false });
  }

  const client = await prisma.client.findUnique({
    where: { id: session.clientId },
    select: {
      id: true,
      name: true,
      email: true,
      logoUrl: true,
      address: true,
      contactNumber: true,
      createdAt: true,
    },
  });

  if (!client) {
    return fail("Client account not found", 401, { loggedIn: false });
  }

  return ok("Authenticated", { loggedIn: true, client });
}

export async function PUT(req: Request) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client" || !session.clientId) {
    return fail("Not authenticated", 401, { loggedIn: false });
  }

  try {
    const parsed = updateClientSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail("Invalid client payload", 400, parsed.error.flatten());
    }

    const client = await prisma.client.update({
      where: { id: session.clientId },
      data: {
        name: parsed.data.name,
        logoUrl: parsed.data.logoUrl || null,
        address: parsed.data.address || null,
        contactNumber: parsed.data.contactNumber || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        logoUrl: true,
        address: true,
        contactNumber: true,
        createdAt: true,
      },
    });

    return ok("Client profile updated", { client });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update client profile";
    return fail(message, 500);
  }
}
