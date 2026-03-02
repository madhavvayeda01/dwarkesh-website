import fs from "node:fs";
import path from "node:path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import mammoth from "mammoth";
import { launchPdfBrowser } from "@/lib/pdf-browser";

function sanitizeDocxXml(xml: string) {
  return xml.replace(/<w:proofErr[^>]*\/>/g, "");
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
        </style>
      </head>
      <body>
        <div class="docx-root">${content}</div>
      </body>
    </html>`;
}

export async function readDocxTemplateBytes(fileUrl: string) {
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

export function renderDocxTemplate(content: Buffer, data: Record<string, string>) {
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

  doc.setData(data);
  doc.render();

  return doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
}

export async function convertDocxBufferToPdf(docxBuffer: Buffer) {
  const htmlResult = await mammoth.convertToHtml(
    { buffer: docxBuffer },
    { includeDefaultStyleMap: true }
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

    return Buffer.from(pdfUint8);
  } finally {
    await browser.close();
  }
}

export function safeComplianceFilePart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}
