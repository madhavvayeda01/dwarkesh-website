import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";
import { generateTrainingCalendar } from "@/lib/training-calendar";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({
  mode: z.enum(["reference", "future"]),
});

function toDdMmYyyy(value: Date): string {
  const dd = String(value.getUTCDate()).padStart(2, "0");
  const mm = String(value.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = value.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function addYears(base: Date, years: number): Date {
  const d = new Date(base);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function yearsBetween(start: Date, end: Date): number[] {
  const from = Math.min(start.getFullYear(), end.getFullYear());
  const to = Math.max(start.getFullYear(), end.getFullYear());
  const years: number[] = [];
  for (let y = from; y <= to; y += 1) years.push(y);
  return years;
}

export async function POST(req: Request) {
  const { error, session } = await requireClientModule("training");
  if (error || !session) return error;

  try {
    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail("Invalid mode. Use reference or future.", 400, parsed.error.flatten());
    }

    const now = new Date();
    const windowStart = parsed.data.mode === "reference" ? addYears(now, -1) : new Date(now);
    const windowEnd = parsed.data.mode === "reference" ? new Date(now) : addYears(now, 1);
    const holidayRows = await prisma.clientHoliday.findMany({
      where: {
        clientId: session.clientId,
        year: { in: yearsBetween(windowStart, windowEnd) },
      },
      select: { date: true },
      orderBy: { date: "asc" },
    });
    const result = generateTrainingCalendar(
      parsed.data.mode,
      now,
      [],
      [],
      holidayRows.map((row) => toDdMmYyyy(row.date))
    );
    if (result.page1.length === 0) {
      return fail("No training names configured. Please generate from admin panel.", 400);
    }
    logger.info("training.calendar.generated", {
      clientId: session.clientId,
      mode: parsed.data.mode,
      rows: result.page1.length,
    });

    return ok("Training calendar generated", result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate training calendar";
    logger.error("training.calendar.error", { message, clientId: session.clientId });
    return fail(message, 500);
  }
}
