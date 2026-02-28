import path from "node:path";
import * as XLSX from "xlsx";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import {
  deleteObjectByPath,
  listSupabaseFilesByPrefix,
  uploadBufferToSupabase,
} from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { launchPdfBrowser } from "@/lib/pdf-browser";

const generateSchema = z.object({
  month: z.number().int().min(0).max(11),
  year: z.number().int().min(2000).max(2100),
});

const deleteSchema = z.object({
  fileName: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-zA-Z0-9._-]+$/, "Invalid file name"),
});

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

type PayslipRow = {
  empCode: string;
  uanNo: string;
  esicNo: string;
  employeeName: string;
  department: string;
  designation: string;
  doj: string;
  payDays: number;
  basic: number;
  hra: number;
  total: number;
  otAmount: number;
  gross: number;
  pf: number;
  esic: number;
  profTax: number;
  totalDeduction: number;
  netPayable: number;
  bankAcNo: string;
  ifscCode: string;
  bankName: string;
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toSafeNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

async function readFileBytes(fileUrl: string): Promise<Buffer | null> {
  try {
    if (/^https?:\/\//i.test(fileUrl)) {
      const res = await fetch(fileUrl);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    }

    if (fileUrl.startsWith("/uploads/")) {
      const fullPath = path.join(process.cwd(), "public", fileUrl);
      const fs = await import("node:fs/promises");
      return await fs.readFile(fullPath);
    }
    return null;
  } catch {
    return null;
  }
}

function parsePayrollRows(bytes: Buffer): PayslipRow[] {
  const wb = XLSX.read(bytes, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: PayslipRow[] = [];

  // Payroll export: row 3 header, row 4+ data.
  for (let row = 4; row <= 5000; row += 1) {
    const empCode = ws[`B${row}`]?.v;
    if (empCode === undefined || empCode === null || String(empCode).trim() === "") break;

    rows.push({
      empCode: String(empCode || "").trim(),
      uanNo: String(ws[`C${row}`]?.v || "").trim(),
      esicNo: String(ws[`D${row}`]?.v || "").trim(),
      employeeName: String(ws[`E${row}`]?.v || "").trim(),
      department: String(ws[`F${row}`]?.v || "").trim(),
      designation: String(ws[`G${row}`]?.v || "").trim(),
      doj: String(ws[`H${row}`]?.v || "").trim(),
      payDays: toSafeNumber(ws[`I${row}`]?.v),
      basic: toSafeNumber(ws[`J${row}`]?.v),
      hra: toSafeNumber(ws[`K${row}`]?.v),
      total: toSafeNumber(ws[`L${row}`]?.v),
      otAmount: toSafeNumber(ws[`M${row}`]?.v),
      gross: toSafeNumber(ws[`N${row}`]?.v),
      pf: toSafeNumber(ws[`O${row}`]?.v),
      esic: toSafeNumber(ws[`P${row}`]?.v),
      profTax: toSafeNumber(ws[`Q${row}`]?.v),
      totalDeduction: toSafeNumber(ws[`R${row}`]?.v),
      netPayable: toSafeNumber(ws[`S${row}`]?.v),
      bankAcNo: String(ws[`U${row}`]?.v || "").trim(),
      ifscCode: String(ws[`V${row}`]?.v || "").trim(),
      bankName: String(ws[`W${row}`]?.v || "").trim(),
    });
  }

  return rows;
}

function inr(value: number): string {
  return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function buildPayslipHtml(
  rows: PayslipRow[],
  monthLabel: string,
  year: number,
  companyName: string,
  companyAddress: string
): string {
  const pages = rows
    .map((row) => {
      const earningsTotal = row.total + row.otAmount;
      const deductionsTotal = row.pf + row.esic + row.profTax;
      return `
        <section class="sheet">
          <header class="head">
            <div>
              <h1>${escapeHtml(companyName)}</h1>
              <p>${escapeHtml(companyAddress || "-")}</p>
            </div>
            <div class="titlebox">
              <h2>Payslip</h2>
              <p>${escapeHtml(monthLabel)} ${year}</p>
            </div>
          </header>

          <div class="meta">
            <div><b>Employee Name:</b> ${escapeHtml(row.employeeName || "-")}</div>
            <div><b>Employee Code:</b> ${escapeHtml(row.empCode || "-")}</div>
            <div><b>Department:</b> ${escapeHtml(row.department || "-")}</div>
            <div><b>Designation:</b> ${escapeHtml(row.designation || "-")}</div>
            <div><b>Date of Joining:</b> ${escapeHtml(row.doj || "-")}</div>
            <div><b>Pay Days:</b> ${escapeHtml(row.payDays || 0)}</div>
          </div>

          <div class="meta">
            <div><b>UAN:</b> ${escapeHtml(row.uanNo || "-")}</div>
            <div><b>ESIC:</b> ${escapeHtml(row.esicNo || "-")}</div>
            <div><b>Bank A/C:</b> ${escapeHtml(row.bankAcNo || "-")}</div>
            <div><b>IFSC:</b> ${escapeHtml(row.ifscCode || "-")}</div>
            <div><b>Bank Name:</b> ${escapeHtml(row.bankName || "-")}</div>
            <div><b>Compliance:</b> PF, ESIC, PT considered</div>
          </div>

          <table class="grid">
            <thead>
              <tr><th>Earnings</th><th>Amount (INR)</th><th>Deductions</th><th>Amount (INR)</th></tr>
            </thead>
            <tbody>
              <tr><td>Basic</td><td>${inr(row.basic)}</td><td>PF</td><td>${inr(row.pf)}</td></tr>
              <tr><td>HRA</td><td>${inr(row.hra)}</td><td>ESIC</td><td>${inr(row.esic)}</td></tr>
              <tr><td>Other Benefit</td><td>${inr(row.total - row.basic - row.hra)}</td><td>Professional Tax</td><td>${inr(row.profTax)}</td></tr>
              <tr><td>OT Amount</td><td>${inr(row.otAmount)}</td><td>Other Deductions</td><td>${inr(Math.max(0, row.totalDeduction - deductionsTotal))}</td></tr>
              <tr class="total"><td>Total Earnings</td><td>${inr(earningsTotal)}</td><td>Total Deductions</td><td>${inr(row.totalDeduction)}</td></tr>
              <tr class="net"><td colspan="3">Net Payable</td><td>${inr(row.netPayable)}</td></tr>
            </tbody>
          </table>

          <footer class="foot">
            <div>This is a system generated payslip.</div>
            <div>For bank/compliance use, verify with payroll register and statutory returns.</div>
          </footer>
        </section>
      `;
    })
    .join("");

  return `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, sans-serif; margin: 0; color: #0f172a; }
      .sheet { width: 100%; box-sizing: border-box; padding: 24px 26px; page-break-after: always; }
      .sheet:last-child { page-break-after: auto; }
      .head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
      .head h1 { margin: 0; font-size: 20px; }
      .head p { margin: 4px 0 0 0; font-size: 11px; color: #334155; max-width: 430px; line-height: 1.4; }
      .titlebox { text-align: right; }
      .titlebox h2 { margin: 0; font-size: 24px; color: #1d4ed8; }
      .titlebox p { margin: 2px 0 0 0; font-weight: 700; }
      .meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px 14px; font-size: 12px; margin-bottom: 12px; border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px; }
      .grid { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
      .grid th, .grid td { border: 1px solid #cbd5e1; padding: 8px; }
      .grid th { background: #e2e8f0; text-align: left; }
      .grid td:nth-child(2), .grid td:nth-child(4) { text-align: right; }
      .total td { font-weight: 700; background: #f8fafc; }
      .net td { font-weight: 800; background: #eff6ff; color: #1e3a8a; }
      .foot { margin-top: 14px; font-size: 10px; color: #475569; display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 8px; }
    </style>
  </head>
  <body>${pages}</body>
  </html>`;
}

export async function GET() {
  const { error, session } = await requireClientModule("payroll");
  if (error || !session) return error;
  if (!session.clientId) return fail("Unauthorized", 401);

  const prefix = `payslip-generated/${session.clientId}/`;
  const listed = await listSupabaseFilesByPrefix(prefix);
  if (!listed.ok) return fail(listed.error, 500);
  return ok("Payslip files fetched", { files: listed.files });
}

export async function POST(req: Request) {
  const { error, session } = await requireClientModule("payroll");
  if (error || !session) return error;
  if (!session.clientId) return fail("Unauthorized", 401);

  const parsed = generateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail("Invalid payload", 400, parsed.error.flatten());
  }

  const monthLabel = MONTHS[parsed.data.month];
  const safeMonth = monthLabel.replace(/[^a-zA-Z0-9_-]/g, "_");
  const payrollPrefix = `payroll-generated/${session.clientId}/`;
  const listed = await listSupabaseFilesByPrefix(payrollPrefix);
  if (!listed.ok) return fail(listed.error, 500);

  const matchPrefix = `payroll_${safeMonth}_${parsed.data.year}_`;
  const candidates = listed.files
    .filter((file) => file.name.startsWith(matchPrefix))
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

  if (candidates.length === 0) {
    return fail(`No payroll data found for ${monthLabel} ${parsed.data.year}`, 404);
  }

  const bytes = await readFileBytes(candidates[0].fileUrl);
  if (!bytes) return fail("Failed to read selected payroll file", 500);

  const payrollRows = parsePayrollRows(bytes);
  if (payrollRows.length === 0) {
    return fail("Payroll file has no employee rows", 400);
  }

  const client = await prisma.client.findUnique({
    where: { id: session.clientId },
    select: { name: true, address: true },
  });

  const html = buildPayslipHtml(
    payrollRows,
    monthLabel,
    parsed.data.year,
    client?.name || "Company",
    client?.address || ""
  );

  const browser = await launchPdfBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "8mm", right: "8mm", bottom: "8mm", left: "8mm" },
    });

    const fileName = `payslip_${safeMonth}_${parsed.data.year}_${Date.now()}.pdf`;
    const objectPath = `payslip-generated/${session.clientId}/${fileName}`;
    const uploaded = await uploadBufferToSupabase(
      Buffer.from(pdfBuffer),
      objectPath,
      "application/pdf"
    );
    if (!uploaded.ok) return fail(uploaded.error, 500);

    return ok("Payslip generated and saved", {
      fileName,
      fileUrl: uploaded.fileUrl,
      month: monthLabel,
      year: parsed.data.year,
      employees: payrollRows.length,
    });
  } finally {
    await browser.close();
  }
}

export async function DELETE(req: Request) {
  const { error, session } = await requireClientModule("payroll");
  if (error || !session) return error;
  if (!session.clientId) return fail("Unauthorized", 401);

  const parsed = deleteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return fail("Invalid delete payload", 400, parsed.error.flatten());
  }

  const objectPath = `payslip-generated/${session.clientId}/${parsed.data.fileName}`;
  const deleted = await deleteObjectByPath(objectPath);
  if (!deleted.ok) return fail(deleted.error, 500);

  return ok("Payslip file deleted", { fileName: parsed.data.fileName });
}
