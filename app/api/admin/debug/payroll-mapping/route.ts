import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { normalizeEmployeeCode } from "@/lib/employee-code";

const querySchema = z.object({
  clientId: z.string().trim().min(1),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    clientId: url.searchParams.get("clientId") || "",
    month: url.searchParams.get("month") || "",
    year: url.searchParams.get("year") || "",
  });
  if (!parsed.success) return fail("Invalid query", 400, parsed.error.flatten());

  const [employees, payrollRows] = await Promise.all([
    prisma.employee.findMany({
      where: { clientId: parsed.data.clientId },
      select: { id: true, empNo: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.payrollRecord.findMany({
      where: {
        clientId: parsed.data.clientId,
        month: parsed.data.month,
        year: parsed.data.year,
      },
      select: { employeeId: true },
    }),
  ]);

  const payrollEmployeeIds = new Set(
    payrollRows.map((row) => row.employeeId).filter((value): value is string => Boolean(value))
  );

  return ok("Payroll mapping debug fetched", {
    rows: employees.map((employee) => ({
      employeeId: employee.id,
      employeeCode: normalizeEmployeeCode(employee.empNo),
      payrollFound: payrollEmployeeIds.has(employee.id),
    })),
  });
}

