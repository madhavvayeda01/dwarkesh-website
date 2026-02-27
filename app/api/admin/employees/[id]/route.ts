import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    await prisma.employee.delete({ where: { id } });
    logger.info("admin.employee.delete.success", { employeeId: id });
    return ok("Employee deleted", null);
  } catch (err: any) {
    logger.error("admin.employee.delete.error", { message: err?.message });
    return fail(err?.message || "Failed to delete employee", 500);
  }
}
