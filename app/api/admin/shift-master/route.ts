import { WeekendType } from "@prisma/client";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const querySchema = z.object({
  clientId: z.string().trim().min(1),
});

const upsertSchema = z.object({
  clientId: z.string().trim().min(1),
  generalShiftEnabled: z.boolean(),
  generalShiftStart: z.string().regex(timeRegex),
  generalShiftEnd: z.string().regex(timeRegex),
  shiftAEnabled: z.boolean(),
  shiftAStart: z.string().regex(timeRegex),
  shiftAEnd: z.string().regex(timeRegex),
  shiftBEnabled: z.boolean(),
  shiftBStart: z.string().regex(timeRegex),
  shiftBEnd: z.string().regex(timeRegex),
  shiftCEnabled: z.boolean(),
  shiftCStart: z.string().regex(timeRegex),
  shiftCEnd: z.string().regex(timeRegex),
  weekendType: z.nativeEnum(WeekendType),
}).refine((data) => data.generalShiftEnabled || data.shiftAEnabled || data.shiftBEnabled || data.shiftCEnabled, {
  message: "Enable at least one shift",
  path: ["generalShiftEnabled"],
});

function toTimeDate(value: string): Date {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

function toHHMM(value: Date): string {
  const hh = String(value.getUTCHours()).padStart(2, "0");
  const mm = String(value.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    clientId: url.searchParams.get("clientId") || "",
  });
  if (!parsed.success) return fail("Invalid query", 400, parsed.error.flatten());

  const config = await prisma.clientShiftConfig.findUnique({
    where: { clientId: parsed.data.clientId },
  });

  if (!config) {
    return ok("Shift config not found", { config: null });
  }

  return ok("Shift config fetched", {
    config: {
      clientId: config.clientId,
      generalShiftEnabled: config.generalShiftEnabled,
      generalShiftStart: toHHMM(config.generalShiftStart),
      generalShiftEnd: toHHMM(config.generalShiftEnd),
      shiftAEnabled: config.shiftAEnabled,
      shiftAStart: toHHMM(config.shiftAStart),
      shiftAEnd: toHHMM(config.shiftAEnd),
      shiftBEnabled: config.shiftBEnabled,
      shiftBStart: toHHMM(config.shiftBStart),
      shiftBEnd: toHHMM(config.shiftBEnd),
      shiftCEnabled: config.shiftCEnabled,
      shiftCStart: toHHMM(config.shiftCStart),
      shiftCEnd: toHHMM(config.shiftCEnd),
      weekendType: config.weekendType,
      updatedAt: config.updatedAt,
    },
  });
}

export async function PUT(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = upsertSchema.safeParse(await req.json());
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());

  const client = await prisma.client.findUnique({
    where: { id: parsed.data.clientId },
    select: { id: true },
  });
  if (!client) return fail("Client not found", 404);

  const saved = await prisma.clientShiftConfig.upsert({
    where: { clientId: parsed.data.clientId },
    create: {
      clientId: parsed.data.clientId,
      generalShiftEnabled: parsed.data.generalShiftEnabled,
      generalShiftStart: toTimeDate(parsed.data.generalShiftStart),
      generalShiftEnd: toTimeDate(parsed.data.generalShiftEnd),
      shiftAEnabled: parsed.data.shiftAEnabled,
      shiftAStart: toTimeDate(parsed.data.shiftAStart),
      shiftAEnd: toTimeDate(parsed.data.shiftAEnd),
      shiftBEnabled: parsed.data.shiftBEnabled,
      shiftBStart: toTimeDate(parsed.data.shiftBStart),
      shiftBEnd: toTimeDate(parsed.data.shiftBEnd),
      shiftCEnabled: parsed.data.shiftCEnabled,
      shiftCStart: toTimeDate(parsed.data.shiftCStart),
      shiftCEnd: toTimeDate(parsed.data.shiftCEnd),
      weekendType: parsed.data.weekendType,
    },
    update: {
      generalShiftEnabled: parsed.data.generalShiftEnabled,
      generalShiftStart: toTimeDate(parsed.data.generalShiftStart),
      generalShiftEnd: toTimeDate(parsed.data.generalShiftEnd),
      shiftAEnabled: parsed.data.shiftAEnabled,
      shiftAStart: toTimeDate(parsed.data.shiftAStart),
      shiftAEnd: toTimeDate(parsed.data.shiftAEnd),
      shiftBEnabled: parsed.data.shiftBEnabled,
      shiftBStart: toTimeDate(parsed.data.shiftBStart),
      shiftBEnd: toTimeDate(parsed.data.shiftBEnd),
      shiftCEnabled: parsed.data.shiftCEnabled,
      shiftCStart: toTimeDate(parsed.data.shiftCStart),
      shiftCEnd: toTimeDate(parsed.data.shiftCEnd),
      weekendType: parsed.data.weekendType,
    },
  });

  return ok("Shift config saved", {
    config: {
      clientId: saved.clientId,
      generalShiftEnabled: saved.generalShiftEnabled,
      generalShiftStart: toHHMM(saved.generalShiftStart),
      generalShiftEnd: toHHMM(saved.generalShiftEnd),
      shiftAEnabled: saved.shiftAEnabled,
      shiftAStart: toHHMM(saved.shiftAStart),
      shiftAEnd: toHHMM(saved.shiftAEnd),
      shiftBEnabled: saved.shiftBEnabled,
      shiftBStart: toHHMM(saved.shiftBStart),
      shiftBEnd: toHHMM(saved.shiftBEnd),
      shiftCEnabled: saved.shiftCEnabled,
      shiftCStart: toHHMM(saved.shiftCStart),
      shiftCEnd: toHHMM(saved.shiftCEnd),
      weekendType: saved.weekendType,
      updatedAt: saved.updatedAt,
    },
  });
}
