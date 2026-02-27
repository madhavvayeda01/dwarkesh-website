import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());

  const existing = await prisma.clientHoliday.findUnique({
    where: { id },
    select: { id: true, clientId: true },
  });
  if (!existing) return fail("Holiday not found", 404);

  const date = toDateOnly(parsed.data.date);
  if (date.getUTCFullYear() !== parsed.data.year) {
    return fail("Date must belong to selected year", 400);
  }

  const duplicate = await prisma.clientHoliday.findFirst({
    where: {
      clientId: existing.clientId,
      date,
      id: { not: id },
    },
    select: { id: true },
  });
  if (duplicate) return fail("Holiday date already exists for this client", 400);

  const updated = await prisma.clientHoliday.update({
    where: { id },
    data: {
      date,
      name: parsed.data.name,
      year: parsed.data.year,
    },
    select: { id: true, date: true, name: true, year: true },
  });

  return ok("Holiday updated", {
    holiday: { ...updated, date: formatDate(updated.date) },
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.clientHoliday.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return fail("Holiday not found", 404);

  await prisma.clientHoliday.delete({ where: { id } });
  return ok("Holiday deleted", { id });
}
