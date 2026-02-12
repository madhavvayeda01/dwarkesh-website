import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";
import * as XLSX from "xlsx";

function clean(v: any): string | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  if (s === "") return undefined;
  if (/^#+$/.test(s)) return undefined;
  return s;
}


export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();

    // ✅ Your client login must set this cookie
    const token = cookieStore.get("client_token")?.value;
    const clientId = cookieStore.get("client_id")?.value;

    if (token !== "logged_in" || !clientId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ message: "File is required" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();

    let rows: any[] = [];

    // =========================
    // ✅ CSV Import
    // =========================
    if (fileName.endsWith(".csv")) {
      const text = await file.text();

      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors?.length) {
        return NextResponse.json(
          { message: parsed.errors[0].message },
          { status: 400 }
        );
      }

      rows = (parsed.data as any[]) || [];
    }

    // =========================
    // ✅ XLSX Import
    // =========================
    else if (fileName.endsWith(".xlsx")) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: "buffer" });

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as any[];
    } else {
      return NextResponse.json(
        { message: "Only CSV or XLSX allowed" },
        { status: 400 }
      );
    }

    if (!rows.length) {
      return NextResponse.json(
        { message: "No rows found in file" },
        { status: 400 }
      );
    }

    // ✅ map file columns to DB columns
    const mapped = rows.map((r) => ({
      clientId,

      empNo: clean(r["Emp NO."]),
      fileNo: clean(r["File No."]),
      pfNo: clean(r["PF No."]),
      uanNo: clean(r["UAN No."]),
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

      dob: clean(r["DOB"]),
      doj: clean(r["DOJ"]),
      dor: clean(r["DOR"]),
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

    // ✅ insert into DB
    const result = await prisma.employee.createMany({
      data: mapped,
      skipDuplicates: true,
    });

    return NextResponse.json({
      ok: true,
      inserted: result.count,
    });
  } catch (err: any) {
    console.log("IMPORT ERROR:", err);
    return NextResponse.json(
      { message: err?.message || "Import failed" },
      { status: 500 }
    );
  }
}
