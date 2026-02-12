import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

import fs from "node:fs";
import path from "node:path";

import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import mammoth from "mammoth";
import puppeteer from "puppeteer";

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN");
}

function sanitizeDocxXml(xml: string): string {
  // Word can inject proofing markers inside {{placeholder}} tokens and break parsing.
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

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("client_token")?.value;
    const clientId = cookieStore.get("client_id")?.value;

    if (token !== "logged_in" || !clientId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      templateId?: string;
      empCode?: string;
    };
    const templateId = body.templateId?.trim();
    const empCode = body.empCode?.trim();

    if (!templateId || !empCode) {
      return NextResponse.json(
        { message: "templateId and empCode required" },
        { status: 400 }
      );
    }

    const template = await prisma.documentTemplate.findFirst({
      where: { id: templateId, clientId },
      include: {
        client: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ message: "Template not found" }, { status: 404 });
    }

    const employee = await prisma.employee.findFirst({
      where: { clientId, empNo: empCode },
    });

    if (!employee) {
      return NextResponse.json(
        { message: "Employee not found for this Emp Code" },
        { status: 404 }
      );
    }

    const templatePath = path.join(process.cwd(), "public", template.fileUrl);
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { message: "Template file missing on server" },
        { status: 500 }
      );
    }

    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);

    const documentXml = zip.file("word/document.xml")?.asText();
    if (documentXml) {
      zip.file("word/document.xml", sanitizeDocxXml(documentXml));
    }

    Object.keys(zip.files)
      .filter(
        (name) =>
          name.startsWith("word/header") && name.endsWith(".xml")
      )
      .forEach((name) => {
        const xml = zip.file(name)?.asText();
        if (xml) zip.file(name, sanitizeDocxXml(xml));
      });

    Object.keys(zip.files)
      .filter(
        (name) =>
          name.startsWith("word/footer") && name.endsWith(".xml")
      )
      .forEach((name) => {
        const xml = zip.file(name)?.asText();
        if (xml) zip.file(name, sanitizeDocxXml(xml));
      });

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => "",
      delimiters: {
        start: "{{",
        end: "}}",
      },
    });

    // Primary placeholders use schema field names.
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

      // Admin-uploaded template placeholders.
      client_name: template.client.name || "",
      employee_full_name: employee.fullName || "",
      employee_emp_no: employee.empNo || "",
      employee_designation: employee.designation || "",
      employee_department: employee.currentDept || "",

      // Backward-compatible aliases for older templates.
      "Emp No": employee.empNo || "",
      "File No": employee.fileNo || "",
      "PF No": employee.pfNo || "",
      "UAN No": employee.uanNo || "",
      "ESIC No": employee.esicNo || "",
      "First Name": employee.firstName || "",
      "Sur Name": employee.surName || "",
      "Father/Spouse Name": employee.fatherSpouseName || "",
      "Full Name": employee.fullName || "",
      "Current Dept": employee.currentDept || "",
      "Salary/Wage": employee.salaryWage || "",
      DOB: formatDate(employee.dob),
      DOJ: formatDate(employee.doj),
      DOR: formatDate(employee.dor),
      "Reason For Exit": employee.reasonForExit || "",
      "PAN No": employee.panNo || "",
      "Aadhar No": employee.aadharNo || "",
      "ELC ID No": employee.elcIdNo || "",
      "Driving Licence No": employee.drivingLicenceNo || "",
      "Bank A/c No": employee.bankAcNo || "",
      "IFSC Code": employee.ifscCode || "",
      "Bank Name": employee.bankName || "",
      "Mobile Number": employee.mobileNumber || "",
      Gender: employee.gender || "",
      Religion: employee.religion || "",
      Nationality: employee.nationality || "",
      "Type of Employment": employee.typeOfEmployment || "",
      "Marital Status": employee.maritalStatus || "",
      "Education Qualification": employee.educationQualification || "",
      "Experience In Relevant Field": employee.experienceInRelevantField || "",
      "Present Add": employee.presentAddress || "",
      "Present Add.": employee.presentAddress || "",
      "Permanent Add": employee.permanentAddress || "",
      "Permanent Add.": employee.permanentAddress || "",
      "Temporary Add": employee.temporaryAddress || "",
      "Temporary Add.": employee.temporaryAddress || "",
      Village: employee.village || "",
      Thana: employee.thana || "",
      "Sub-Division": employee.subDivision || "",
      "Sub- Division": employee.subDivision || "",
      "Post Office": employee.postOffice || "",
      District: employee.district || "",
      State: employee.state || "",
      "Pin Code": employee.pinCode || "",
      "Name Of Nominee1": employee.nominee1Name || "",
      "Relation Nominee1": employee.nominee1Relation || "",
      "Birth date Nominee-1": formatDate(employee.nominee1BirthDate),
      "Age Nominee 1": employee.nominee1Age || "",
      "Proportion Will be shared-1": employee.nominee1Proportion || "",
      "Proportion Will be shared- 1": employee.nominee1Proportion || "",
      "Name Of Nominee-2": employee.nominee2Name || "",
      "Relation Nominee2": employee.nominee2Relation || "",
      "Relation Nominee-2": employee.nominee2Relation || "",
      "Birth date Nominee-2": formatDate(employee.nominee2BirthDate),
      "Age Nominee 2": employee.nominee2Age || "",
      "Proportion Will be shared-2": employee.nominee2Proportion || "",
    };

    doc.setData(data);

    try {
      doc.render();
    } catch (error: any) {
      const details = extractDocxErrorDetails(error);

      return NextResponse.json(
        {
          message: details
            ? `Template placeholder rendering failed: ${details}`
            : "Template placeholder rendering failed",
          error: error?.message || String(error),
        },
        { status: 400 }
      );
    }

    const updatedDocxBuffer = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    const htmlResult = await mammoth.convertToHtml({ buffer: updatedDocxBuffer });
    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Arial, sans-serif; font-size: 12pt; }
          </style>
        </head>
        <body>
          ${htmlResult.value}
        </body>
      </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfUint8 = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    return new Response(Buffer.from(pdfUint8), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${employee.empNo}_${template.title}.pdf"`,
      },
    });
  } catch (err: any) {
    const details = extractDocxErrorDetails(err);
    return NextResponse.json(
      {
        message: details
          ? `Failed to generate PDF: ${details}`
          : err?.message || "Failed to generate PDF",
      },
      { status: 500 }
    );
  }
}
