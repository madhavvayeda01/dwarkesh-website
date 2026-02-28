import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  active: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return fail("Invalid consultant update payload", 400, parsed.error.flatten());

  if (typeof parsed.data.active !== "boolean") {
    return fail("No consultant changes provided.", 400);
  }

  const consultant = await prisma.consultant.update({
    where: { id },
    data: { active: parsed.data.active },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  }).catch(() => null);

  if (!consultant) return fail("Consultant not found", 404);

  return ok("Consultant updated", { consultant });
}

export async function DELETE(_: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;
  const consultant = await prisma.consultant.delete({
    where: { id },
    select: { id: true },
  }).catch(() => null);

  if (!consultant) return fail("Consultant not found", 404);

  return ok("Consultant deleted", { id: consultant.id });
}
