import { z } from "zod";
import { ok, fail } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { ensureStorageConfigured, uploadBufferToSupabase, deleteObjectByPath } from "@/lib/storage";
import { generateFutureComplianceSchedule } from "@/lib/compliance-schedule";
import {
  convertDocxBufferToPdf,
  readDocxTemplateBytes,
  renderDocxTemplate,
  safeComplianceFilePart,
} from "@/lib/compliance-template-render";

const categorySchema = z.enum(["TRAINING", "COMMITTEE"]);

const querySchema = z.object({
  clientId: z.string().trim().min(1),
  category: categorySchema,
});

const createSchema = z.object({
  clientId: z.string().trim().min(1),
  category: categorySchema,
  countPerTitle: z.number().int().min(1).max(12).optional(),
});

function toDateLabel(value: Date) {
  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildTemplateData(
  client: { name: string | null; address: string | null; logoUrl: string | null },
  title: string,
  scheduledFor: Date,
  category: "TRAINING" | "COMMITTEE"
) {
  const dateLabel = toDateLabel(scheduledFor);
  return {
    client_name: client.name || "",
    client_address: client.address || "",
    client_logo: client.logoUrl || "",
    title,
    event_title: title,
    category: category === "TRAINING" ? "Training" : "Committee Meeting",
    date: dateLabel,
    scheduled_date: dateLabel,
    scheduled_iso: scheduledFor.toISOString().slice(0, 10),
  };
}

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    clientId: url.searchParams.get("clientId") || "",
    category: url.searchParams.get("category") || "",
  });
  if (!parsed.success) {
    return fail("Invalid query", 400, parsed.error.flatten());
  }

  const { clientId, category } = parsed.data;

  const [templates, events] = await Promise.all([
    prisma.complianceScheduleTemplate.findMany({
      where: { clientId, category },
      orderBy: { createdAt: "desc" },
    }),
    prisma.complianceScheduleEvent.findMany({
      where: { clientId, category },
      orderBy: { scheduledFor: "asc" },
    }),
  ]);

  return ok("Compliance schedules fetched", {
    templates,
    events: events.map((event) => ({
      ...event,
      scheduledLabel: toDateLabel(event.scheduledFor),
    })),
  });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const storageError = ensureStorageConfigured();
  if (storageError) return storageError;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail("Invalid payload", 400, parsed.error.flatten());
  }

  const { clientId, category, countPerTitle = 4 } = parsed.data;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, address: true, logoUrl: true },
  });
  if (!client) return fail("Client not found", 404);

  const templates = await prisma.complianceScheduleTemplate.findMany({
    where: { clientId, category },
    orderBy: { title: "asc" },
  });
  if (templates.length === 0) {
    return fail("Upload at least one template first.", 400);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const holidayRows = await prisma.clientHoliday.findMany({
    where: {
      clientId,
      date: { gte: today },
    },
    select: { date: true },
    orderBy: { date: "asc" },
  });

  const schedule = generateFutureComplianceSchedule({
    titles: templates.map((template) => template.title),
    holidays: holidayRows.map((row) => row.date.toISOString().slice(0, 10)),
    countPerTitle,
  });

  const existingFutureEvents = await prisma.complianceScheduleEvent.findMany({
    where: {
      clientId,
      category,
      scheduledFor: { gte: today },
    },
    select: { id: true, generatedFilePath: true },
  });

  for (const event of existingFutureEvents) {
    if (event.generatedFilePath) {
      await deleteObjectByPath(event.generatedFilePath);
    }
  }

  await prisma.complianceScheduleEvent.deleteMany({
    where: {
      clientId,
      category,
      scheduledFor: { gte: today },
    },
  });

  const templateBufferById = new Map<string, Buffer>();
  const generatedEvents = [] as Array<{
    title: string;
    scheduledFor: Date;
    generatedFileUrl: string;
    generatedFilePath: string;
    templateId: string;
  }>;

  for (const row of schedule) {
    const template = templates.find((item) => item.title === row.title);
    if (!template) continue;

    let templateBuffer = templateBufferById.get(template.id);
    if (!templateBuffer) {
      templateBuffer = await readDocxTemplateBytes(template.fileUrl);
      templateBufferById.set(template.id, templateBuffer);
    }

    const renderedDocx = renderDocxTemplate(
      templateBuffer,
      buildTemplateData(client, row.title, row.scheduledFor, category)
    );
    const renderedPdf = await convertDocxBufferToPdf(renderedDocx);
    const safeName = `${row.scheduledIso}__${safeComplianceFilePart(row.title)}.pdf`;
    const objectPath = `compliance-generated/${clientId}/${category.toLowerCase()}/${safeName}`;
    const uploaded = await uploadBufferToSupabase(renderedPdf, objectPath, "application/pdf");
    if (!uploaded.ok) {
      return fail(uploaded.error, 500);
    }

    generatedEvents.push({
      title: row.title,
      scheduledFor: row.scheduledFor,
      generatedFileUrl: uploaded.fileUrl,
      generatedFilePath: objectPath,
      templateId: template.id,
    });
  }

  if (generatedEvents.length === 0) {
    return fail("No schedules could be generated.", 400);
  }

  const createdEvents = await prisma.$transaction(
    generatedEvents.map((event) =>
      prisma.complianceScheduleEvent.create({
        data: {
          clientId,
          category,
          title: event.title,
          scheduledFor: event.scheduledFor,
          templateId: event.templateId,
          generatedFileUrl: event.generatedFileUrl,
          generatedFilePath: event.generatedFilePath,
        },
      })
    )
  );

  return ok("Compliance schedule generated", {
    events: createdEvents.map((event) => ({
      ...event,
      scheduledLabel: toDateLabel(event.scheduledFor),
    })),
  });
}
