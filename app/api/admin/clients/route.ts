import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";

const createClientSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(1),
  logoUrl: z.string().trim().url().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  contactNumber: z.string().trim().optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const parsed = createClientSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail("Invalid client payload", 400, parsed.error.flatten());
    }

    const { name, email, password, logoUrl, address, contactNumber } = parsed.data;

    const existing = await prisma.client.findUnique({ where: { email } });
    if (existing) {
      return fail("Client already exists with this email", 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const client = await prisma.client.create({
      data: {
        name,
        email,
        password: passwordHash,
        logoUrl: logoUrl || null,
        address: address || null,
        contactNumber: contactNumber || null,
        moduleControl: {
          create: {},
        },
      },
    });

    logger.info("admin.client.create.success", { clientId: client.id, email: client.email });
    return ok("Client created", { client }, 201);
  } catch (err: any) {
    logger.error("admin.client.create.error", { message: err?.message });
    return fail(err?.message || "Failed to create client", 500);
  }
}
