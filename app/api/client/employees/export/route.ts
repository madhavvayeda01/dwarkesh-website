import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";

const HEADERS = [
  "Emp NO.",
  "File No.",
  "PF No.",
  "UAN No.",
  "ESIC No.",
  "First Name",
  "Sur Name",
  "Father/Spouse Name",
  "Full Name",
  "Status",
  "Designation",
  "Current Dept.",
  "Salary/Wage",
  "DOB",
  "DOJ",
  "DOR",
  "Reason For Exit",
  "PAN No.",
  "Aadhar No.",
  "ELC ID No.",
  "Driving Licence No.",
  "Bank A/c No.",
  "IFSC Code",
  "Bank Name",
  "Mobile Number",
  "Gender",
  "Religion",
  "Nationality",
  "Type of employment",
  "Marital Status",
  "Education Qualification",
  "Experience In relevant Field",
  "Present Add.",
  "Permanent Add.",
  "Village",
  "Thana",
  "Sub- Division",
  "Post Office",
  "District",
  "State",
  "Pin Code",
  "Temporary Add.",
  "Name Of Nominee1",
  "Relation Nominee1",
  "Birth date Nominee-1",
  "Age Nominee 1",
  "Proportion Will be shared-1",
  "Name Of Nominee-2",
  "Relation Nominee2",
  "Birth date Nominee-2",
  "Age Nominee 2",
  "Proportion Will be shared-2",
];

function text(value: string | null | undefined): string {
  return value ?? "";
}

export async function GET() {
  const { error, session } = await requireClientModule("employees");
  if (error || !session) return error;

  try {
    const employees = await prisma.employee.findMany({
      where: { clientId: session.clientId },
      orderBy: { createdAt: "asc" },
    });

    const rows = employees.map((e) => [
      text(e.empNo),
      text(e.fileNo),
      text(e.pfNo),
      text(e.uanNo),
      text(e.esicNo),
      text(e.firstName),
      text(e.surName),
      text(e.fatherSpouseName),
      text(e.fullName),
      text(e.employmentStatus),
      text(e.designation),
      text(e.currentDept),
      text(e.salaryWage),
      text(e.dob),
      text(e.doj),
      text(e.dor),
      text(e.reasonForExit),
      text(e.panNo),
      text(e.aadharNo),
      text(e.elcIdNo),
      text(e.drivingLicenceNo),
      text(e.bankAcNo),
      text(e.ifscCode),
      text(e.bankName),
      text(e.mobileNumber),
      text(e.gender),
      text(e.religion),
      text(e.nationality),
      text(e.typeOfEmployment),
      text(e.maritalStatus),
      text(e.educationQualification),
      text(e.experienceInRelevantField),
      text(e.presentAddress),
      text(e.permanentAddress),
      text(e.village),
      text(e.thana),
      text(e.subDivision),
      text(e.postOffice),
      text(e.district),
      text(e.state),
      text(e.pinCode),
      text(e.temporaryAddress),
      text(e.nominee1Name),
      text(e.nominee1Relation),
      text(e.nominee1BirthDate),
      text(e.nominee1Age),
      text(e.nominee1Proportion),
      text(e.nominee2Name),
      text(e.nominee2Relation),
      text(e.nominee2BirthDate),
      text(e.nominee2Age),
      text(e.nominee2Proportion),
    ]);

    const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employee Master");

    const fileBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const date = new Date().toISOString().slice(0, 10);
    const fileName = `employee_master_${date}.xlsx`;

    const binary = Uint8Array.from(fileBuffer);
    return new Response(binary, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to export employee data";
    return fail(message, 500);
  }
}
