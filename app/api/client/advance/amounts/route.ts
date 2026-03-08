import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { loadAdvanceSource } from "@/lib/advance-source";

const querySchema = z.object({
  month: z.coerce.number().int().min(0).max(11),
  year: z.coerce.number().int().min(2000).max(2100),
});

export async function GET(req: Request) {
  const { error, session } = await requireClientModule("payroll");
  if (error || !session) return error;
  if (!session.clientId) return fail("Unauthorized", 401);
  const clientId = session.clientId;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    month: url.searchParams.get("month"),
    year: url.searchParams.get("year"),
  });
  if (!parsed.success) {
    return fail("Invalid query", 400, parsed.error.flatten());
  }

  try {
    const source = await loadAdvanceSource(clientId, parsed.data.month, parsed.data.year);
    const amounts: Record<string, number> = {};
    for (const [code, amount] of source.amountsByCode.entries()) {
      amounts[code] = amount;
    }

    return ok("Advance amounts fetched", {
      month: parsed.data.month,
      year: parsed.data.year,
      fileName: source.debug.fileName,
      updatedAt: source.debug.updatedAt,
      parsedRows: source.debug.parsedRows,
      uniqueCodes: source.debug.uniqueCodes,
      warnings: source.debug.warnings,
      amounts,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to parse advance file";
    return fail(message, 500);
  }
}
