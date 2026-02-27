import { z } from "zod";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";
import { normalizeEmployeeCodeOrNull } from "@/lib/employee-code";
import { normalizeImportedDate } from "@/lib/excel-date";

function clean(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  if (s === "" || /^#+$/.test(s)) return undefined;
  return s;
}

function normalizeUanNo(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;

  if (typeof v === "number" && Number.isFinite(v)) {
    const digits = Math.trunc(v).toString().replace(/\D/g, "");
    return digits || undefined;
  }

  const s = String(v).trim();
  if (s === "" || /^#+$/.test(s)) return undefined;

  const compact = s.replace(/[\s,]/g, "");
  const numeric = Number(compact);
  if (Number.isFinite(numeric)) {
    const plain = numeric.toLocaleString("fullwide", { useGrouping: false });
    const digits = plain.replace(/\D/g, "");
    return digits || undefined;
  }

  const digits = compact.replace(/\D/g, "");
  return digits || undefined;
}

const rowSchema = z.object({}).catchall(z.unknown());

export async function POST(req: Request) {
  const { error, session } = await requireClientModule("employees");
  if (error || !session) return error;

  try {
    const clientId = session.clientId;
    if (!clientId) return fail("Unauthorized", 401);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return fail("File is required", 400);

    const fileName = file.name.toLowerCase();
    let rows: Record<string, unknown>[] = [];

    if (fileName.endsWith(".csv")) {
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (parsed.errors?.length) return fail(parsed.errors[0].message, 400);
      rows = (parsed.data as Record<string, unknown>[]) || [];
    } else if (fileName.endsWith(".xlsx")) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: "",
      }) as Record<string, unknown>[];
    } else {
      return fail("Only CSV or XLSX allowed", 400);
    }

    if (!rows.length) return fail("No rows found in file", 400);

    const mapped = rows
      .map((raw) => rowSchema.parse(raw))
      .map((r) => ({
        clientId,
        empNo: normalizeEmployeeCodeOrNull(clean(r["Emp NO."])) || undefined,
        fileNo: clean(r["File No."]),
        pfNo: clean(r["PF No."]),
        uanNo: normalizeUanNo(r["UAN No."]),
        esicNo: clean(r["ESIC No."]),
        firstName: clean(r["First Name"]),
        surName: clean(r["Sur Name"]),
        fatherSpouseName: clean(r["Father/Spouse Name"]),
        fullName:
          clean(r["Full Name"]) ??
          [clean(r["First Name"]), clean(r["Sur Name"])].filter(Boolean).join(" ") ??
          "UNKNOWN",
        designation: clean(r["Designation"]),
        currentDept: clean(r["Current Dept."]),
        salaryWage: clean(r["Salary/Wage"]),
        dob: normalizeImportedDate(r["DOB"]),
        doj: normalizeImportedDate(r["DOJ"]),
        dor: normalizeImportedDate(r["DOR"]),
        reasonForExit: clean(r["Reason For Exit"]),
        panNo: clean(r["PAN No."]),
        aadharNo: clean(r["Aadhar No."]),
        elcIdNo: clean(r["ELC ID No."]),
        drivingLicenceNo: clean(r["Driving Licence No."]),
        bankAcNo: clean(r["Bank A/c No."]),
        ifscCode: clean(r["IFSC Code"]),
        bankName: clean(r["Bank Name"]),
        mobileNumber: clean(r["Mobile Number"]),
        gender: clean(r["Gender"]),
        religion: clean(r["Religion"]),
        nationality: clean(r["Nationality"]),
        typeOfEmployment: clean(r["Type of employment"]),
        maritalStatus: clean(r["Marital Status"]),
        educationQualification: clean(r["Education Qualification"]),
        experienceInRelevantField: clean(r["Experience In relevant Field"]),
        presentAddress: clean(r["Present Add."]),
        permanentAddress: clean(r["Permanent Add."]),
        village: clean(r["Village"]),
        thana: clean(r["Thana"]),
        subDivision: clean(r["Sub- Division"]),
        postOffice: clean(r["Post Office"]),
        district: clean(r["District"]),
        state: clean(r["State"]),
        pinCode: clean(r["Pin Code"]),
        temporaryAddress: clean(r["Temporary Add."]),
        nominee1Name: clean(r["Name Of Nominee1"]),
        nominee1Relation: clean(r["Relation Nominee1"]),
        nominee1BirthDate: clean(r["Birth date Nominee-1"]),
        nominee1Age: clean(r["Age Nominee 1"]),
        nominee1Proportion: clean(r["Proportion Will be shared-1"]),
        nominee2Name: clean(r["Name Of Nominee-2"]),
        nominee2Relation: clean(r["Relation Nominee2"]),
        nominee2BirthDate: clean(r["Birth date Nominee-2"]),
        nominee2Age: clean(r["Age Nominee 2"]),
        nominee2Proportion: clean(r["Proportion Will be shared-2"]),
      }));

    const withEmpNo = mapped.filter((row) => row.empNo);
    const withoutEmpNo = mapped.filter((row) => !row.empNo);

    // If same employee code appears multiple times in file, keep the last occurrence.
    const latestByEmpNo = new Map<string, (typeof mapped)[number]>();
    for (const row of withEmpNo) {
      latestByEmpNo.set(row.empNo as string, row);
    }
    const dedupedWithEmpNo = Array.from(latestByEmpNo.values());
    const employeeCodes = Array.from(latestByEmpNo.keys());

    const result = await prisma.$transaction(async (tx) => {
      let replaced = 0;
      if (employeeCodes.length > 0) {
        const deleted = await tx.employee.deleteMany({
          where: {
            clientId,
            empNo: { in: employeeCodes },
          },
        });
        replaced = deleted.count;
      }

      const inserted = await tx.employee.createMany({
        data: [...dedupedWithEmpNo, ...withoutEmpNo],
      });

      return { inserted: inserted.count, replaced };
    });

    logger.info("employee.import.success", {
      clientId: session.clientId,
      rows: rows.length,
      inserted: result.inserted,
      replaced: result.replaced,
    });

    return ok(
      "Employee import completed",
      { inserted: result.inserted, replaced: result.replaced },
      201
    );
  } catch (err: any) {
    logger.error("employee.import.error", {
      clientId: session.clientId,
      message: err?.message,
    });
    return fail(err?.message || "Import failed", 500);
  }
}
