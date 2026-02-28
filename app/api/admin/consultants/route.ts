import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { DEFAULT_ADMIN_PAGE_ACCESS } from "@/lib/admin-config";
import { toStoredAdminPageAccessMap } from "@/lib/admin-access";
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
      pageAccess: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return ok("Consultants fetched", {
    consultants: consultants.map((consultant) => ({
      ...consultant,
      pageAccess: toStoredAdminPageAccessMap(consultant.pageAccess),
    })),
  });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = createConsultantSchema.safeParse(await req.json());
  if (!parsed.success) return fail("Invalid consultant payload", 400, parsed.error.flatten());

  const normalizedEmail = parsed.data.email.trim().toLowerCase();

  const exists = await prisma.consultant.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (exists) {
    return fail("A consultant with this email already exists.", 409);
  }

  const existingClient = await prisma.client.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existingClient) {
    return fail("This email is already being used by a client account.", 409);
  }

  const password = await bcrypt.hash(parsed.data.password, 10);
  try {
    const consultant = await prisma.consultant.create({
      data: {
        name: parsed.data.name.trim(),
        email: normalizedEmail,
        password,
        active: true,
        pageAccess: DEFAULT_ADMIN_PAGE_ACCESS,
      },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        pageAccess: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return ok("Consultant created", {
      consultant: {
        ...consultant,
        pageAccess: toStoredAdminPageAccessMap(consultant.pageAccess),
      },
    }, 201);
  } catch (createError: unknown) {
    if (
      createError instanceof Prisma.PrismaClientKnownRequestError &&
      createError.code === "P2002"
    ) {
      return fail("A consultant with this email already exists.", 409);
    }

    throw createError;
  }
}
