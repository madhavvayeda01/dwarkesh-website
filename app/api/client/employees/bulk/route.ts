import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";

const bulkSchema = z.object({
  action: z.enum(["delete", "set_active", "set_inactive"]),
  employeeIds: z.array(z.string().trim().min(1)).min(1),
});

export async function POST(req: Request) {
  const { error, session } = await requireClientModule("employees");
  if (error || !session) return error;

  try {
    const parsed = bulkSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail("Invalid bulk employee payload", 400, parsed.error.flatten());
    }

    const clientId = session.clientId;
    if (!clientId) return fail("Unauthorized", 401);

    const uniqueIds = Array.from(new Set(parsed.data.employeeIds));
    const ownedEmployees = await prisma.employee.findMany({
      where: {
        clientId,
        id: { in: uniqueIds },
      },
      select: { id: true },
    });

    if (ownedEmployees.length === 0) {
      return fail("No matching employees found", 404);
    }

    const ownedIds = ownedEmployees.map((employee) => employee.id);
    let affected = 0;

    if (parsed.data.action === "delete") {
      const result = await prisma.employee.deleteMany({
        where: {
          clientId,
          id: { in: ownedIds },
        },
      });
      affected = result.count;
    } else {
      const employmentStatus = parsed.data.action === "set_active" ? "ACTIVE" : "INACTIVE";
      const result = await prisma.employee.updateMany({
        where: {
          clientId,
          id: { in: ownedIds },
        },
        data: { employmentStatus },
      });
      affected = result.count;
    }

    logger.info("employee.bulk.success", {
      clientId,
      action: parsed.data.action,
      affected,
    });

    return ok("Bulk employee action completed", {
      action: parsed.data.action,
      affected,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to complete bulk employee action";
    logger.error("employee.bulk.error", {
      clientId: session?.clientId,
      message,
    });
    return fail(message, 500);
  }
}
