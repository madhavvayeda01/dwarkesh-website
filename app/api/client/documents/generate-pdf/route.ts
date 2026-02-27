import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import mammoth from "mammoth";
import puppeteer from "puppeteer";
import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";

const generateSchema = z.object({
  templateId: z.string().trim().min(1),
  empCode: z.string().trim().min(1),
});

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN");
}

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
  const { error, session } = await requireClientModule("documents");
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
      include: { client: { select: { name: true } } },
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

    const data = {
      empNo: employee.empNo || "",
      fileNo: employee.fileNo || "",
      pfNo: employee.pfNo || "",
      uanNo: employee.uanNo || "",
      esicNo: employee.esicNo || "",
      firstName: employee.firstName || "",
      surName: employee.surName || "",
      fatherSpouseName: employee.fatherSpouseName || "",
      fullName: employee.fullName || "",
      designation: employee.designation || "",
      currentDept: employee.currentDept || "",
      salaryWage: employee.salaryWage || "",
      dob: formatDate(employee.dob),
      doj: formatDate(employee.doj),
      dor: formatDate(employee.dor),
      reasonForExit: employee.reasonForExit || "",
      panNo: employee.panNo || "",
      aadharNo: employee.aadharNo || "",
      elcIdNo: employee.elcIdNo || "",
      drivingLicenceNo: employee.drivingLicenceNo || "",
      bankAcNo: employee.bankAcNo || "",
      ifscCode: employee.ifscCode || "",
      bankName: employee.bankName || "",
      mobileNumber: employee.mobileNumber || "",
      gender: employee.gender || "",
      religion: employee.religion || "",
      nationality: employee.nationality || "",
      typeOfEmployment: employee.typeOfEmployment || "",
      maritalStatus: employee.maritalStatus || "",
      educationQualification: employee.educationQualification || "",
      experienceInRelevantField: employee.experienceInRelevantField || "",
      presentAddress: employee.presentAddress || "",
      permanentAddress: employee.permanentAddress || "",
      village: employee.village || "",
      thana: employee.thana || "",
      subDivision: employee.subDivision || "",
      postOffice: employee.postOffice || "",
      district: employee.district || "",
      state: employee.state || "",
      pinCode: employee.pinCode || "",
      temporaryAddress: employee.temporaryAddress || "",
      nominee1Name: employee.nominee1Name || "",
      nominee1Relation: employee.nominee1Relation || "",
      nominee1BirthDate: formatDate(employee.nominee1BirthDate),
      nominee1Age: employee.nominee1Age || "",
      nominee1Proportion: employee.nominee1Proportion || "",
      nominee2Name: employee.nominee2Name || "",
      nominee2Relation: employee.nominee2Relation || "",
      nominee2BirthDate: formatDate(employee.nominee2BirthDate),
      nominee2Age: employee.nominee2Age || "",
      nominee2Proportion: employee.nominee2Proportion || "",
      client_name: template.client.name || "",
      employee_full_name: employee.fullName || "",
      employee_emp_no: employee.empNo || "",
      employee_designation: employee.designation || "",
      employee_department: employee.currentDept || "",
    };

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

    const htmlResult = await mammoth.convertToHtml({ buffer: updatedDocxBuffer });
    const html = `
      <html><head><meta charset="UTF-8" /><style>body { font-family: Arial, sans-serif; font-size: 12pt; }</style></head>
      <body>${htmlResult.value}</body></html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfUint8 = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    logger.info("pdf.generate.success", { clientId: session.clientId, templateId, empCode });
    const binary = Uint8Array.from(pdfUint8);
    return new Response(binary, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${employee.empNo}_${template.title}.pdf"`,
      },
    });
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
