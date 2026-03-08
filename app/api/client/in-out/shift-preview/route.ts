import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { previewInOutGenerator } from "@/lib/shift-master-service";

const querySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export async function GET(req: Request) {
  const { error, session } = await requireClientModule("in_out");
  if (error || !session) return error;
  const clientId = session.clientId;
  if (!clientId) return fail("Unauthorized", 401);

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    month: url.searchParams.get("month"),
    year: url.searchParams.get("year"),
  });
  if (!parsed.success) return fail("Invalid query", 400, parsed.error.flatten());

  const preview = await previewInOutGenerator(
    clientId,
    parsed.data.month,
    parsed.data.year
  );

  if ("error" in preview) {
    return fail(preview.error, 400, {
      warnings: "warnings" in preview ? preview.warnings : [],
      missingEmployeePayroll:
        "missingEmployeePayroll" in preview ? preview.missingEmployeePayroll : [],
    });
  }

  return ok("Shift preview fetched", {
    month: parsed.data.month,
    year: parsed.data.year,
    daysInMonth: preview.daysInMonth,
    holidaysCount: preview.holidaysCount,
    holidays: preview.holidays || [],
    weekendType: preview.weekendType,
    shiftConfig: preview.shiftConfig,
    warnings: preview.warnings || [],
    employees: preview.employees,
  });
}
