import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import mammoth from "mammoth";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";
import { generateTrainingCalendar } from "@/lib/training-calendar";
import { prisma } from "@/lib/prisma";
import { ensureStorageConfigured, uploadBufferToSupabase } from "@/lib/storage";
import { launchPdfBrowser } from "@/lib/pdf-browser";

const requestSchema = z.object({
  companyId: z.string().trim().min(1),
  mode: z.enum(["reference", "future"]),
  holidays: z.array(z.string().trim()).default([]),
});

const MODULE_GROUPS = ["Training", "Committee", "Committees"] as const;

const moduleSlug: Record<(typeof MODULE_GROUPS)[number], string> = {
  Training: "training",
  Committee: "committees",
  Committees: "committees",
};

function sanitizeDocxXml(xml: string): string {
  return xml.replace(/<w:proofErr[^>]*\/>/g, "");
}

async function readTemplateBytes(fileUrl: string) {
  if (/^https?:\/\//i.test(fileUrl)) {
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`Template fetch failed (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
  const templatePath = path.join(process.cwd(), "public", fileUrl);
  if (!fs.existsSync(templatePath)) throw new Error("Template file missing on server");
  return fs.readFileSync(templatePath);
}

function renderTemplateWithDate(content: Buffer, dateLabel: string) {
  const zip = new PizZip(content);
  const documentXml = zip.file("word/document.xml")?.asText();
  if (documentXml) zip.file("word/document.xml", sanitizeDocxXml(documentXml));

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
    delimiters: { start: "{", end: "}" },
  });
  doc.setData({ date: dateLabel });
  doc.render();
  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
}

async function convertDocxToPdf(docxBuffer: Buffer) {
  const htmlResult = await mammoth.convertToHtml({ buffer: docxBuffer });
  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>body { font-family: Arial, sans-serif; font-size: 12pt; }</style>
      </head>
      <body>${htmlResult.value}</body>
    </html>
  `;

  const browser = await launchPdfBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfUint8 = await page.pdf({ format: "A4", printBackground: true });
    return Buffer.from(pdfUint8);
  } finally {
    await browser.close();
  }
}

function safeFilePart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

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
  const { error } = await requireAdmin();
  if (error) return error;

  const storageError = ensureStorageConfigured();
  if (storageError) return storageError;

  try {
    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail("Invalid payload", 400, parsed.error.flatten());
    }

    const company = await prisma.client.findUnique({
      where: { id: parsed.data.companyId },
      select: { id: true, name: true, email: true },
    });
    if (!company) {
      return fail("Selected company not found.", 404);
    }

    const templates = await prisma.documentTemplate.findMany({
      where: {
        clientId: company.id,
        group: { name: { in: [...MODULE_GROUPS] } },
      },
      include: { group: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    if (templates.length === 0) {
      return fail(
        "Please upload training/committee templates first (groups: Training, Committee).",
        400
      );
    }

    const now = new Date();
    const windowStart = parsed.data.mode === "reference" ? addYears(now, -1) : new Date(now);
    const windowEnd = parsed.data.mode === "reference" ? new Date(now) : addYears(now, 1);
    const holidayYears = yearsBetween(windowStart, windowEnd);
    const holidayRows = await prisma.clientHoliday.findMany({
      where: {
        clientId: company.id,
        year: { in: holidayYears },
      },
      select: { date: true },
      orderBy: { date: "asc" },
    });
    const holidayInput = holidayRows.map((row) => toDdMmYyyy(row.date));

    const result = generateTrainingCalendar(
      parsed.data.mode,
      now,
      templates
        .filter((template) => template.group.name === "Training")
        .map((template) => template.title),
      templates
        .filter(
          (template) =>
            template.group.name === "Committee" || template.group.name === "Committees"
        )
        .map((template) => template.title),
      holidayInput
    );
    if (result.page1.length === 0) return fail("No training entries available to generate.", 400);
    if (result.page2.length === 0) {
      return fail("No holidays configured in Holiday Master for selected company.", 400);
    }

    const generatedFiles: Array<{
      module: string;
      date: string;
      templateTitle: string;
      fileUrl: string;
    }> = [];

    for (const template of templates) {
      const groupName = template.group.name as (typeof MODULE_GROUPS)[number];
      const slug = moduleSlug[groupName];
      const templateContent = await readTemplateBytes(template.fileUrl);

      for (const row of result.page1) {
        const renderedDocx = renderTemplateWithDate(templateContent, row.dateLabel);
        const renderedPdf = await convertDocxToPdf(renderedDocx);
        const fileName = `${row.dateIso}__${safeFilePart(template.title)}.pdf`;
        const objectPath = `training-generated/${company.id}/${slug}/${fileName}`;
        const uploaded = await uploadBufferToSupabase(
          renderedPdf,
          objectPath,
          "application/pdf"
        );
        if (!uploaded.ok) {
          return fail(uploaded.error, 500);
        }
        generatedFiles.push({
          module: slug,
          date: row.dateIso,
          templateTitle: template.title,
          fileUrl: uploaded.fileUrl,
        });
      }
    }

    logger.info("admin.training.calendar.generated", {
      companyId: company.id,
      mode: parsed.data.mode,
      trainingCount: templates.filter((template) => template.group.name === "Training").length,
      committeeCount: templates.filter(
        (template) =>
          template.group.name === "Committee" || template.group.name === "Committees"
      ).length,
      holidaysCount: result.page2.length,
      rows: result.page1.length,
      templates: templates.length,
      generatedFiles: generatedFiles.length,
    });

    return ok("Training calendar generated", {
      ...result,
      company,
      generatedFilesCount: generatedFiles.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate training calendar";
    logger.error("admin.training.calendar.error", { message });
    return fail(message, 500);
  }
}
