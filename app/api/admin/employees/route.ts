import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildEmployeeCreateData } from "@/lib/employee-data";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";

const createEmployeeSchema = z.object({
  clientId: z.string().trim().min(1),
  fullName: z.string().trim().min(1),
}).passthrough();

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const clientId = new URL(req.url).searchParams.get("clientId")?.trim() || undefined;
    const employees = await prisma.employee.findMany({
      where: clientId ? { clientId } : undefined,
      orderBy: { createdAt: "desc" },
    });
    logger.info("admin.employee.list.success", { clientId, count: employees.length });
    return ok("Employees fetched", { employees });
  } catch (err: any) {
    logger.error("admin.employee.list.error", { message: err?.message });
    return fail(err?.message || "Failed to fetch employees", 500);
  }
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const parsed = createEmployeeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail("Invalid employee payload", 400, parsed.error.flatten());
    }

    const data = buildEmployeeCreateData(parsed.data, parsed.data.clientId);
    if (!data.fullName) return fail("fullName is required", 400);

    const employee = await prisma.employee.create({ data });
    logger.info("admin.employee.create.success", { employeeId: employee.id, clientId: employee.clientId });
    return ok("Employee created", { employee }, 201);
  } catch (err: any) {
    logger.error("admin.employee.create.error", { message: err?.message });
    return fail(err?.message || "Failed to create employee", 500);
  }
}
