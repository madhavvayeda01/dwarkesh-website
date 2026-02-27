import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";

const updatePasswordSchema = z.object({
  password: z.string().trim().min(1),
});

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    await prisma.client.delete({ where: { id } });
    logger.info("admin.client.delete.success", { clientId: id });
    return ok("Client deleted", null);
  } catch (err: any) {
    logger.error("admin.client.delete.error", { message: err?.message });
    return fail(err?.message || "Failed to delete client", 500);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const parsed = updatePasswordSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail("Password required", 400, parsed.error.flatten());
    }

    const hashed = await bcrypt.hash(parsed.data.password, 10);
    await prisma.client.update({
      where: { id },
      data: { password: hashed },
    });

    logger.info("admin.client.password_update.success", { clientId: id });
    return ok("Password updated", null);
  } catch (err: any) {
    logger.error("admin.client.password_update.error", { message: err?.message });
    return fail(err?.message || "Failed to update password", 500);
  }
}
