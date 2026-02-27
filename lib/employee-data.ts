import type { Prisma } from "@prisma/client";
import { normalizeEmployeeCodeOrNull } from "@/lib/employee-code";

type InputBody = Record<string, unknown>;

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function readStringOrNullForUpdate(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function pick(body: InputBody, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = readString(body[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function pickForUpdate(body: InputBody, ...keys: string[]): string | null | undefined {
  for (const key of keys) {
    const value = readStringOrNullForUpdate(body[key]);
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
    empNo: normalizeEmployeeCodeOrNull(pick(body, "empNo")) || undefined,
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

export function buildEmployeeUpdateData(
  body: InputBody
): Prisma.EmployeeUncheckedUpdateInput {
  const firstName = pickForUpdate(body, "firstName");
  const surName = pickForUpdate(body, "surName");
  const fullNameFromBody = pickForUpdate(body, "fullName");
  const fullName =
    fullNameFromBody !== undefined
      ? fullNameFromBody
      : typeof firstName === "string" || typeof surName === "string"
        ? [firstName, surName].filter((v): v is string => Boolean(v)).join(" ").trim() || null
        : undefined;

  const rawEmpNo = pickForUpdate(body, "empNo");
  const empNo =
    rawEmpNo === undefined
      ? undefined
      : rawEmpNo === null
        ? null
        : normalizeEmployeeCodeOrNull(rawEmpNo);

  return {
    empNo,
    fileNo: pickForUpdate(body, "fileNo"),
    pfNo: pickForUpdate(body, "pfNo"),
    uanNo: pickForUpdate(body, "uanNo"),
    esicNo: pickForUpdate(body, "esicNo"),

    firstName,
    surName,
    fatherSpouseName: pickForUpdate(body, "fatherSpouseName"),
    fullName,

    designation: pickForUpdate(body, "designation"),
    currentDept: pickForUpdate(body, "currentDept"),
    salaryWage: pickForUpdate(body, "salaryWage"),

    dob: pickForUpdate(body, "dob"),
    doj: pickForUpdate(body, "doj"),
    dor: pickForUpdate(body, "dor"),
    reasonForExit: pickForUpdate(body, "reasonForExit"),

    panNo: pickForUpdate(body, "panNo"),
    aadharNo: pickForUpdate(body, "aadharNo"),
    elcIdNo: pickForUpdate(body, "elcIdNo"),
    drivingLicenceNo: pickForUpdate(body, "drivingLicenceNo"),

    bankAcNo: pickForUpdate(body, "bankAcNo"),
    ifscCode: pickForUpdate(body, "ifscCode"),
    bankName: pickForUpdate(body, "bankName"),

    mobileNumber: pickForUpdate(body, "mobileNumber"),
    gender: pickForUpdate(body, "gender"),
    religion: pickForUpdate(body, "religion"),
    nationality: pickForUpdate(body, "nationality"),
    typeOfEmployment: pickForUpdate(body, "typeOfEmployment"),
    maritalStatus: pickForUpdate(body, "maritalStatus"),
    educationQualification: pickForUpdate(body, "educationQualification"),
    experienceInRelevantField: pickForUpdate(body, "experienceInRelevantField"),

    presentAddress: pickForUpdate(body, "presentAddress"),
    permanentAddress: pickForUpdate(body, "permanentAddress"),
    village: pickForUpdate(body, "village"),
    thana: pickForUpdate(body, "thana"),
    subDivision: pickForUpdate(body, "subDivision"),
    postOffice: pickForUpdate(body, "postOffice"),
    district: pickForUpdate(body, "district"),
    state: pickForUpdate(body, "state"),
    pinCode: pickForUpdate(body, "pinCode"),
    temporaryAddress: pickForUpdate(body, "temporaryAddress"),

    nominee1Name: pickForUpdate(body, "nominee1Name"),
    nominee1Relation: pickForUpdate(body, "nominee1Relation"),
    nominee1BirthDate: pickForUpdate(body, "nominee1BirthDate"),
    nominee1Age: pickForUpdate(body, "nominee1Age"),
    nominee1Proportion: pickForUpdate(body, "nominee1Proportion"),

    nominee2Name: pickForUpdate(body, "nominee2Name"),
    nominee2Relation: pickForUpdate(body, "nominee2Relation"),
    nominee2BirthDate: pickForUpdate(body, "nominee2BirthDate"),
    nominee2Age: pickForUpdate(body, "nominee2Age"),
    nominee2Proportion: pickForUpdate(body, "nominee2Proportion"),
  };
}
