import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import mammoth from "mammoth";
import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";
import { buildPersonalFileTemplateData } from "@/lib/personal-file-placeholders";
import { launchPdfBrowser } from "@/lib/pdf-browser";

const generateSchema = z.object({
  templateId: z.string().trim().min(1),
  empCode: z.string().trim().min(1),
});

function sanitizeDocxXml(xml: string): string {
  return xml.replace(/<w:proofErr[^>]*\/>/g, "");
}

function extractDocxErrorDetails(error: any): string {
  return (
    error?.properties?.errors
      ?.map((e: any) => e?.properties?.explanation || e?.message)
      .filter(Boolean)
      .join(" | ") || ""
  );
}

function buildPrintableHtml(content: string) {
  return `<!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          @page {
            size: A4;
            margin: 14mm 12mm;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
          }

          body {
            font-family: "Times New Roman", Times, serif;
            font-size: 12pt;
            line-height: 1.2;
            color: #000000;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .docx-root {
            width: 100%;
          }

          p {
            margin: 0 0 6pt;
          }

          h1,
          h2,
          h3,
          h4,
          h5,
          h6 {
            margin: 0 0 8pt;
            line-height: 1.15;
          }

          table {
            width: 100% !important;
            border-collapse: collapse;
            table-layout: fixed;
            margin: 0 0 8pt;
          }

          tr {
            page-break-inside: avoid;
          }

          td,
          th {
            border: 1px solid #000000 !important;
            padding: 3pt 6pt;
            vertical-align: top;
            word-break: break-word;
            overflow-wrap: anywhere;
          }

          td p,
          th p {
            margin: 0;
          }

          img {
            max-width: 100%;
            height: auto;
          }

          strong,
          b {
            font-weight: 700;
          }

          em,
          i {
            font-style: italic;
          }

          u {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="docx-root">${content}</div>
      </body>
    </html>`;
}

async function readTemplateBytes(fileUrl: string) {
  if (/^https?:\/\//i.test(fileUrl)) {
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`Template fetch failed (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
  const templatePath = path.join(process.cwd(), "public", fileUrl);
  if (!fs.existsSync(templatePath)) {
    throw new Error("Template file missing on server");
  }
  return fs.readFileSync(templatePath);
}

export async function POST(req: Request) {
  const { error, session } = await requireClientModule("employees");
  if (error || !session) return error;

  try {
    const parsed = generateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail("Invalid payload", 400, parsed.error.flatten());
    }
    const { templateId, empCode } = parsed.data;

    logger.info("pdf.generate.start", { clientId: session.clientId, templateId, empCode });

    const template = await prisma.documentTemplate.findFirst({
      where: { id: templateId, clientId: session.clientId },
      include: { client: { select: { name: true, address: true, logoUrl: true } } },
    });
    if (!template) return fail("Template not found", 404);

    const employee = await prisma.employee.findFirst({
      where: { clientId: session.clientId, empNo: empCode },
    });
    if (!employee) return fail("Employee not found for this Emp Code", 404);

    const content = await readTemplateBytes(template.fileUrl);
    const zip = new PizZip(content);

    const documentXml = zip.file("word/document.xml")?.asText();
    if (documentXml) zip.file("word/document.xml", sanitizeDocxXml(documentXml));
    Object.keys(zip.files)
      .filter((name) => name.startsWith("word/header") && name.endsWith(".xml"))
      .forEach((name) => {
        const xml = zip.file(name)?.asText();
        if (xml) zip.file(name, sanitizeDocxXml(xml));
      });
    Object.keys(zip.files)
      .filter((name) => name.startsWith("word/footer") && name.endsWith(".xml"))
      .forEach((name) => {
        const xml = zip.file(name)?.asText();
        if (xml) zip.file(name, sanitizeDocxXml(xml));
      });

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => "",
      delimiters: { start: "{{", end: "}}" },
    });

    const data = buildPersonalFileTemplateData(employee, template.client);

    doc.setData(data);
    try {
      doc.render();
    } catch (renderErr: any) {
      const details = extractDocxErrorDetails(renderErr);
      return fail(
        details ? `Template placeholder rendering failed: ${details}` : "Template placeholder rendering failed",
        400
      );
    }

    const updatedDocxBuffer = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    const htmlResult = await mammoth.convertToHtml(
      { buffer: updatedDocxBuffer },
      {
        includeDefaultStyleMap: true,
      }
    );
    const html = buildPrintableHtml(htmlResult.value);

    const browser = await launchPdfBrowser();
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 1 });
      await page.emulateMediaType("screen");
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdfUint8 = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });

      logger.info("pdf.generate.success", { clientId: session.clientId, templateId, empCode });
      const binary = Uint8Array.from(pdfUint8);
      return new Response(binary, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${employee.empNo}_${template.title}.pdf"`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (err: any) {
    logger.error("pdf.generate.error", {
      clientId: session.clientId,
      message: err?.message,
    });
    const details = extractDocxErrorDetails(err);
    return fail(
      details ? `Failed to generate PDF: ${details}` : err?.message || "Failed to generate PDF",
      500
    );
  }
}
