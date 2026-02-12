import type { Prisma } from "@prisma/client";

type InputBody = Record<string, unknown>;

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function pick(body: InputBody, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = readString(body[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

export function buildEmployeeCreateData(
  body: InputBody,
  clientId: string
): Prisma.EmployeeUncheckedCreateInput {
  const firstName = pick(body, "firstName");
  const surName = pick(body, "surName");
  const fullName =
    pick(body, "fullName") ??
    ([firstName, surName].filter(Boolean).join(" ").trim() || undefined);

  return {
    clientId,
    empNo: pick(body, "empNo"),
    fileNo: pick(body, "fileNo"),
    pfNo: pick(body, "pfNo"),
    uanNo: pick(body, "uanNo"),
    esicNo: pick(body, "esicNo"),

    firstName,
    surName,
    fatherSpouseName: pick(body, "fatherSpouseName"),
    fullName,

    designation: pick(body, "designation"),
    currentDept: pick(body, "currentDept"),
    salaryWage: pick(body, "salaryWage"),

    dob: pick(body, "dob"),
    doj: pick(body, "doj"),
    dor: pick(body, "dor"),
    reasonForExit: pick(body, "reasonForExit"),

    panNo: pick(body, "panNo"),
    aadharNo: pick(body, "aadharNo"),
    elcIdNo: pick(body, "elcIdNo"),
    drivingLicenceNo: pick(body, "drivingLicenceNo"),

    bankAcNo: pick(body, "bankAcNo"),
    ifscCode: pick(body, "ifscCode"),
    bankName: pick(body, "bankName"),

    mobileNumber: pick(body, "mobileNumber"),
    gender: pick(body, "gender"),
    religion: pick(body, "religion"),
    nationality: pick(body, "nationality"),
    typeOfEmployment: pick(body, "typeOfEmployment"),
    maritalStatus: pick(body, "maritalStatus"),
    educationQualification: pick(body, "educationQualification"),
    experienceInRelevantField: pick(body, "experienceInRelevantField"),

    presentAddress: pick(body, "presentAddress"),
    permanentAddress: pick(body, "permanentAddress"),
    village: pick(body, "village"),
    thana: pick(body, "thana"),
    subDivision: pick(body, "subDivision"),
    postOffice: pick(body, "postOffice"),
    district: pick(body, "district"),
    state: pick(body, "state"),
    pinCode: pick(body, "pinCode"),
    temporaryAddress: pick(body, "temporaryAddress"),

    nominee1Name: pick(body, "nominee1Name"),
    nominee1Relation: pick(body, "nominee1Relation"),
    nominee1BirthDate: pick(body, "nominee1BirthDate"),
    nominee1Age: pick(body, "nominee1Age"),
    nominee1Proportion: pick(body, "nominee1Proportion"),

    nominee2Name: pick(body, "nominee2Name"),
    nominee2Relation: pick(body, "nominee2Relation"),
    nominee2BirthDate: pick(body, "nominee2BirthDate"),
    nominee2Age: pick(body, "nominee2Age"),
    nominee2Proportion: pick(body, "nominee2Proportion"),
  };
}
