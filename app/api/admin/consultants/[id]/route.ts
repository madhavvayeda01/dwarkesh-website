import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { ADMIN_PAGE_KEYS, type AdminPageAccessMap, type AdminPageKey } from "@/lib/admin-config";
import {
  getStoredConsultantAdminPageAccess,
  mergeAdminPageAccess,
  toStoredAdminPageAccessMap,
} from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  active: z.boolean().optional(),
  pageAccess: z
    .object(
      Object.fromEntries(
        ADMIN_PAGE_KEYS.map((key) => [key, z.boolean().optional()])
      ) as Record<AdminPageKey, z.ZodOptional<z.ZodBoolean>>
    )
    .optional(),
}).refine(
  (value) =>
    typeof value.active === "boolean" ||
    (value.pageAccess && Object.keys(value.pageAccess).length > 0),
  {
    message: "No consultant changes provided.",
  }
);

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await context.params;
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return fail("Invalid consultant update payload", 400, parsed.error.flatten());

  const nextPageAccess =
    parsed.data.pageAccess && Object.keys(parsed.data.pageAccess).length > 0
      ? mergeAdminPageAccess(
          await getStoredConsultantAdminPageAccess(id),
          parsed.data.pageAccess as Partial<AdminPageAccessMap>
        )
      : undefined;

  const consultant = await prisma.consultant.update({
    where: { id },
    data: {
      ...(typeof parsed.data.active === "boolean" ? { active: parsed.data.active } : {}),
      ...(nextPageAccess ? { pageAccess: nextPageAccess } : {}),
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
  }).catch(() => null);

  if (!consultant) return fail("Consultant not found", 404);

  return ok("Consultant updated", {
    consultant: {
      ...consultant,
      pageAccess: toStoredAdminPageAccessMap(consultant.pageAccess),
    },
  });
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
