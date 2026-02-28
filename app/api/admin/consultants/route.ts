import bcrypt from "bcrypt";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const createConsultantSchema = z.object({
  name: z.string().trim().min(2, "Consultant name is required."),
  email: z.string().trim().email("Enter a valid consultant email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const consultants = await prisma.consultant.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return ok("Consultants fetched", { consultants });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = createConsultantSchema.safeParse(await req.json());
  if (!parsed.success) return fail("Invalid consultant payload", 400, parsed.error.flatten());

  const exists = await prisma.consultant.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (exists) {
    return fail("A consultant with this email already exists.", 409);
  }

  const password = await bcrypt.hash(parsed.data.password, 10);
  const consultant = await prisma.consultant.create({
    data: {
      name: parsed.data.name.trim(),
      email: parsed.data.email.trim().toLowerCase(),
      password,
      active: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return ok("Consultant created", { consultant }, 201);
}
