import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";
import { buildEmployeeUpdateData } from "@/lib/employee-data";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireClientModule("employees");
  if (error || !session) return error;

  try {
    const { id } = await params;
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee || employee.clientId !== session.clientId) {
      return fail("Not allowed", 403);
    }

    await prisma.employee.delete({ where: { id } });
    logger.info("employee.delete.success", {
      clientId: session.clientId,
      employeeId: id,
    });
    return ok("Employee deleted", null);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete employee";
    logger.error("employee.delete.error", {
      clientId: session.clientId,
      message,
    });
    return fail(message, 500);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireClientModule("employees");
  if (error || !session) return error;

  try {
    const { id } = await params;
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee || employee.clientId !== session.clientId) {
      return fail("Not allowed", 403);
    }

    const body = (await req.json()) as Record<string, unknown>;
    const data = buildEmployeeUpdateData(body);

    const updated = await prisma.employee.update({
      where: { id },
      data,
    });

    logger.info("employee.update.success", {
      clientId: session.clientId,
      employeeId: id,
    });

    return ok("Employee updated", { employee: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update employee";
    logger.error("employee.update.error", {
      clientId: session.clientId,
      message,
    });
    return fail(message, 500);
  }
}
