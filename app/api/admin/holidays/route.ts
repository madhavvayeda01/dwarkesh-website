import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  clientId: z.string().trim().min(1),
  year: z.coerce.number().int().min(2000).max(2100),
});

const createSchema = z.object({
  clientId: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().trim().min(1),
  year: z.number().int().min(2000).max(2100),
});

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    clientId: url.searchParams.get("clientId") || "",
    year: url.searchParams.get("year") || "",
  });
  if (!parsed.success) return fail("Invalid query", 400, parsed.error.flatten());

  const holidays = await prisma.clientHoliday.findMany({
    where: { clientId: parsed.data.clientId, year: parsed.data.year },
    orderBy: { date: "asc" },
    select: { id: true, date: true, name: true, year: true },
  });

  return ok("Holidays fetched", {
    holidays: holidays.map((holiday) => ({
      ...holiday,
      date: formatDate(holiday.date),
    })),
  });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());

  const date = toDateOnly(parsed.data.date);
  if (date.getUTCFullYear() !== parsed.data.year) {
    return fail("Date must belong to selected year", 400);
  }

  const exists = await prisma.clientHoliday.findUnique({
    where: { clientId_date: { clientId: parsed.data.clientId, date } },
    select: { id: true },
  });
  if (exists) return fail("Holiday date already exists for this client", 400);

  const created = await prisma.clientHoliday.create({
    data: {
      clientId: parsed.data.clientId,
      date,
      name: parsed.data.name,
      year: parsed.data.year,
    },
    select: { id: true, date: true, name: true, year: true },
  });

  return ok("Holiday added", {
    holiday: { ...created, date: formatDate(created.date) },
  });
}
