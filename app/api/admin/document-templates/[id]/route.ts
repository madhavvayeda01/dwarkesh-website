import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";

const updateTemplateSchema = z.object({
  title: z.string().trim().min(1),
});

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    await prisma.documentTemplate.delete({ where: { id } });
    logger.info("admin.template.delete.success", { templateId: id });
    return ok("Template deleted", null);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete template";
    logger.error("admin.template.delete.error", { message });
    return fail(message, 500);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const parsed = updateTemplateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail("Invalid template payload", 400, parsed.error.flatten());
    }

    const { id } = await params;
    const template = await prisma.documentTemplate.update({
      where: { id },
      data: { title: parsed.data.title },
    });

    logger.info("admin.template.update.success", { templateId: id });
    return ok("Template updated", { template });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update template";
    logger.error("admin.template.update.error", { message });
    return fail(message, 500);
  }
}
