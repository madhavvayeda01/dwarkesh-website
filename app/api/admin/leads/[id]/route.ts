import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    await prisma.lead.delete({ where: { id } });
    logger.info("admin.lead.delete.success", { leadId: id });
    return ok("Enquiry deleted", null);
  } catch (err: any) {
    logger.error("admin.lead.delete.error", { message: err?.message });
    return fail(err?.message || "Failed to delete enquiry", 500);
  }
}
