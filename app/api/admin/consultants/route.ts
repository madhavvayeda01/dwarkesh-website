import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { DEFAULT_ADMIN_PAGE_ACCESS } from "@/lib/admin-config";
import { toStoredAdminPageAccessMap } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { isMissingColumnError } from "@/lib/prisma-compat";

const createConsultantSchema = z.object({
  name: z.string().trim().min(2, "Consultant name is required."),
  email: z.string().trim().email("Enter a valid consultant email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const consultants: Array<{
    id: string;
    name: string;
    email: string;
    active: boolean;
    pageAccess: unknown;
    createdAt: Date;
    updatedAt: Date;
  }> = await prisma.consultant.findMany({
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
    consultants: consultants.map((consultant: {
      id: string;
      name: string;
      email: string;
      active: boolean;
      pageAccess: unknown;
      createdAt: Date;
      updatedAt: Date;
    }) => ({
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
    const consultant = await createConsultantWithSchemaCompat({
      name: parsed.data.name.trim(),
      email: normalizedEmail,
      password,
    });

    return ok("Consultant created", {
      consultant: {
        ...consultant,
        pageAccess: toStoredAdminPageAccessMap(consultant.pageAccess),
      },
    }, 201);
  } catch (createError: unknown) {
    if (
      typeof createError === "object" &&
      createError !== null &&
      "code" in createError &&
      (createError as { code?: string }).code === "P2002"
    ) {
      return fail("A consultant with this email already exists.", 409);
    }

    throw createError;
  }
}

async function createConsultantWithSchemaCompat(input: {
  name: string;
  email: string;
  password: string;
}) {
  try {
    return await prisma.consultant.create({
      data: {
        name: input.name,
        email: input.email,
        password: input.password,
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
  } catch (error) {
    if (!isMissingColumnError(error, "Consultant", "sessionVersion")) {
      throw error;
    }

    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "Consultant" ("id", "name", "email", "password", "active", "pageAccess", "createdAt", "updatedAt")
      VALUES (${id}, ${input.name}, ${input.email}, ${input.password}, ${true}, ${DEFAULT_ADMIN_PAGE_ACCESS as object}, NOW(), NOW())
    `;

    const consultant = await prisma.consultant.findUnique({
      where: { id },
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

    if (!consultant) {
      throw new Error("Failed to create consultant in compatibility mode.");
    }

    return consultant;
  }
}
