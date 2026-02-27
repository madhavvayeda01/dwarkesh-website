import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { normalizeEmployeeCode } from "@/lib/employee-code";

const querySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export async function GET(req: Request) {
  const { error, session } = await requireClientModule("in_out");
  if (error || !session) return error;
  if (!session.clientId) return fail("Unauthorized", 401);

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    month: url.searchParams.get("month"),
    year: url.searchParams.get("year"),
  });
  if (!parsed.success) {
    return fail("Invalid query", 400, parsed.error.flatten());
  }

  const rows = await prisma.payrollRecord.findMany({
    where: {
      clientId: session.clientId,
      month: parsed.data.month,
      year: parsed.data.year,
    },
    select: {
      employeeCode: true,
      payDays: true,
    },
  });

  const payDaysByCode: Record<string, number> = {};
  for (const row of rows) {
    const code = normalizeEmployeeCode(row.employeeCode);
    if (!code) continue;
    payDaysByCode[code] = Number(row.payDays || 0);
  }

  return ok("Payroll pay days fetched", {
    month: parsed.data.month,
    year: parsed.data.year,
    payDaysByCode,
  });
}

