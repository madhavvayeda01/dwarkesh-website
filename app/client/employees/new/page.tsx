"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import ClientSidebar from "@/components/ClientSidebar";

type FieldType = "text" | "date" | "textarea" | "select";

type FieldConfig = {
  key: string;
  label: string;
  type?: FieldType;
  options?: string[];
};

type ExistingEmployee = {
  id: string;
  empNo: string | null;
  fullName: string | null;
};

type CodeParts = {
  prefix: string;
  number: number;
  width: number;
  raw: string;
};

type EmployeeCodeOption = {
  value: string;
  label: string;
  kind: "gap" | "next";
  scope: string;
};

const fields: FieldConfig[] = [
  { key: "empNo", label: "Emp No." },
  { key: "fileNo", label: "File No." },
  { key: "pfNo", label: "PF No." },
  { key: "uanNo", label: "UAN No." },
  { key: "esicNo", label: "ESIC No." },
  { key: "firstName", label: "First Name" },
  { key: "surName", label: "Sur Name" },
  { key: "fatherSpouseName", label: "Father/Spouse Name" },
  { key: "fullName", label: "Full Name" },
  { key: "employmentStatus", label: "Status", type: "select", options: ["ACTIVE", "INACTIVE"] },
  { key: "employeeFileStatus", label: "Employee File", type: "select", options: ["PENDING", "CREATED"] },
  { key: "shiftCategory", label: "Shift Category", type: "select", options: ["STAFF", "WORKER"] },
  { key: "designation", label: "Designation" },
  { key: "currentDept", label: "Current Dept." },
  { key: "salaryWage", label: "Salary/Wage" },
  { key: "dob", label: "DOB", type: "date" },
  { key: "doj", label: "DOJ", type: "date" },
  { key: "dor", label: "DOR", type: "date" },
  { key: "reasonForExit", label: "Reason For Exit" },
  { key: "panNo", label: "PAN No." },
  { key: "aadharNo", label: "Aadhar No." },
  { key: "elcIdNo", label: "ELC ID No." },
  { key: "drivingLicenceNo", label: "Driving Licence No." },
  { key: "bankAcNo", label: "Bank A/c No." },
  { key: "ifscCode", label: "IFSC Code" },
  { key: "bankName", label: "Bank Name" },
  { key: "mobileNumber", label: "Mobile Number" },
  { key: "gender", label: "Gender" },
  { key: "religion", label: "Religion" },
  { key: "nationality", label: "Nationality" },
  { key: "typeOfEmployment", label: "Type Of Employment" },
  { key: "maritalStatus", label: "Marital Status" },
  { key: "educationQualification", label: "Education Qualification" },
  { key: "experienceInRelevantField", label: "Experience In Relevant Field" },
  { key: "presentAddress", label: "Present Address", type: "textarea" },
  { key: "permanentAddress", label: "Permanent Address", type: "textarea" },
  { key: "village", label: "Village" },
  { key: "thana", label: "Thana" },
  { key: "subDivision", label: "Sub-Division" },
  { key: "postOffice", label: "Post Office" },
  { key: "district", label: "District" },
  { key: "state", label: "State" },
  { key: "pinCode", label: "Pin Code" },
  { key: "temporaryAddress", label: "Temporary Address", type: "textarea" },
  { key: "nominee1Name", label: "Nominee 1 Name" },
  { key: "nominee1Relation", label: "Nominee 1 Relation" },
  { key: "nominee1BirthDate", label: "Nominee 1 Birth Date", type: "date" },
  { key: "nominee1Age", label: "Nominee 1 Age" },
  { key: "nominee1Proportion", label: "Nominee 1 Proportion" },
  { key: "nominee2Name", label: "Nominee 2 Name" },
  { key: "nominee2Relation", label: "Nominee 2 Relation" },
  { key: "nominee2BirthDate", label: "Nominee 2 Birth Date", type: "date" },
  { key: "nominee2Age", label: "Nominee 2 Age" },
  { key: "nominee2Proportion", label: "Nominee 2 Proportion" },
];

const emptyFormBase = Object.fromEntries(
  fields.map((field) => [
    field.key,
    field.key === "employmentStatus"
      ? "ACTIVE"
      : field.key === "employeeFileStatus"
        ? "PENDING"
        : field.key === "shiftCategory"
          ? "WORKER"
        : "",
  ])
) as Record<string, string>;

const sectionDescriptions: Record<string, string> = {
  "Code & Identity": "Keep employee code, file number, core IDs, and name details together.",
  "Employment Details": "Track status, department, salary, and joining or exit dates in one section.",
  "Compliance & Banking": "Capture statutory IDs, bank details, and contact information accurately.",
  "Address Details": "Store present, permanent, and local area address fields in one block.",
  Nominees: "Maintain nominee records and their distribution details here.",
};

function createEmptyForm(code = ""): Record<string, string> {
  return {
    ...emptyFormBase,
    empNo: code,
    fileNo: code,
  };
}

function getFieldSection(key: string): string {
  if (
    [
      "empNo",
      "fileNo",
      "pfNo",
      "uanNo",
      "esicNo",
      "firstName",
      "surName",
      "fatherSpouseName",
      "fullName",
    ].includes(key)
  ) {
    return "Code & Identity";
  }

  if (
    [
      "employmentStatus",
      "employeeFileStatus",
      "shiftCategory",
      "designation",
      "currentDept",
      "salaryWage",
      "dob",
      "doj",
      "dor",
      "reasonForExit",
    ].includes(key)
  ) {
    return "Employment Details";
  }

  if (
    [
      "panNo",
      "aadharNo",
      "elcIdNo",
      "drivingLicenceNo",
      "bankAcNo",
      "ifscCode",
      "bankName",
      "mobileNumber",
      "gender",
      "religion",
      "nationality",
      "typeOfEmployment",
      "maritalStatus",
      "educationQualification",
      "experienceInRelevantField",
    ].includes(key)
  ) {
    return "Compliance & Banking";
  }

  if (
    [
      "presentAddress",
      "permanentAddress",
      "village",
      "thana",
      "subDivision",
      "postOffice",
      "district",
      "state",
      "pinCode",
      "temporaryAddress",
    ].includes(key)
  ) {
    return "Address Details";
  }

  return "Nominees";
}

function toCompactText(value: string | null): string {
  return (value || "").trim();
}

function parseEmployeeCode(value: string | null): CodeParts | null {
  const raw = toCompactText(value);
  if (!raw) return null;
  const match = raw.match(/^([^0-9]*)(\d+)$/);
  if (!match) return null;
  const number = Number.parseInt(match[2], 10);
  if (!Number.isFinite(number)) return null;

  return {
    prefix: match[1].toUpperCase(),
    number,
    width: match[2].length,
    raw,
  };
}

function formatEmployeeCode(prefix: string, number: number, width: number): string {
  return `${prefix}${String(number).padStart(width, "0")}`;
}

function buildEmployeeCodeOptions(existingEmployees: ExistingEmployee[]): EmployeeCodeOption[] {
  const parsedCodes = existingEmployees
    .map((employee) => parseEmployeeCode(employee.empNo))
    .filter((parts): parts is CodeParts => parts !== null);

  if (parsedCodes.length === 0) {
    return [
      {
        value: "001",
        label: "001 - Next in line",
        kind: "next",
        scope: "ALL",
      },
    ];
  }

  const groupedByPrefix = new Map<string, CodeParts[]>();
  for (const parsedCode of parsedCodes) {
    const items = groupedByPrefix.get(parsedCode.prefix) || [];
    items.push(parsedCode);
    groupedByPrefix.set(parsedCode.prefix, items);
  }

  const gapOptions: EmployeeCodeOption[] = [];
  for (const [prefix, items] of Array.from(groupedByPrefix.entries()).sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    const numbers = items.map((item) => item.number);
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const width = Math.max(...items.map((item) => item.width), 1);
    const existingNumbers = new Set(numbers);

    for (let number = min; number <= max; number += 1) {
      if (!existingNumbers.has(number)) {
        const value = formatEmployeeCode(prefix, number, width);
        gapOptions.push({
          value,
          label: prefix ? `${value} - Gap in ${prefix}` : `${value} - Gap code`,
          kind: "gap",
          scope: prefix || "ALL",
        });
      }
    }
  }

  if (gapOptions.length > 0) {
    return gapOptions;
  }

  const [preferredPrefix, preferredItems] = Array.from(groupedByPrefix.entries()).sort((left, right) => {
    if (right[1].length !== left[1].length) return right[1].length - left[1].length;

    const leftMax = Math.max(...left[1].map((item) => item.number));
    const rightMax = Math.max(...right[1].map((item) => item.number));
    if (rightMax !== leftMax) return rightMax - leftMax;

    return left[0].localeCompare(right[0]);
  })[0];

  const width = Math.max(...preferredItems.map((item) => item.width), 1);
  const nextNumber = Math.max(...preferredItems.map((item) => item.number)) + 1;
  const nextCode = formatEmployeeCode(preferredPrefix, nextNumber, width);

  return [
    {
      value: nextCode,
      label: preferredPrefix ? `${nextCode} - Next in ${preferredPrefix}` : `${nextCode} - Next in line`,
      kind: "next",
      scope: preferredPrefix || "ALL",
    },
  ];
}

export default function AddNewEmployeePage() {
  const [form, setForm] = useState<Record<string, string>>(() => createEmptyForm());
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [moduleEnabled, setModuleEnabled] = useState<boolean | null>(null);
  const [existingEmployees, setExistingEmployees] = useState<ExistingEmployee[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(true);

  async function loadExistingEmployees() {
    setLoadingCodes(true);
    try {
      const res = await fetch("/api/client/employees", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return [] as ExistingEmployee[];

      const payload = data?.data ?? data;
      const nextEmployees = Array.isArray(payload?.employees) ? payload.employees : [];
      setExistingEmployees(nextEmployees);
      return nextEmployees as ExistingEmployee[];
    } finally {
      setLoadingCodes(false);
    }
  }

  useEffect(() => {
    async function checkLogin() {
      const res = await fetch("/api/client/me");
      const data = await res.json();
      const loggedIn = data?.data?.loggedIn ?? data?.loggedIn ?? false;
      if (!loggedIn) {
        window.location.href = "/signin";
        return;
      }

      const accessRes = await fetch("/api/client/modules?page=add_employee", { cache: "no-store" });
      const accessData = await accessRes.json().catch(() => ({}));
      const enabled = accessRes.ok ? accessData?.data?.enabled !== false : true;
      setModuleEnabled(enabled);

      if (!enabled) {
        setLoadingCodes(false);
        return;
      }

      const nextEmployees = await loadExistingEmployees();
      const suggestedCode = buildEmployeeCodeOptions(nextEmployees)[0]?.value || "";
      setForm((prev) => (prev.empNo.trim() ? { ...prev, fileNo: prev.empNo.trim() } : createEmptyForm(suggestedCode)));
    }

    checkLogin();
  }, []);

  const fullNamePreview = useMemo(() => {
    if (form.fullName.trim()) return form.fullName.trim();
    return [form.firstName.trim(), form.surName.trim()].filter(Boolean).join(" ");
  }, [form.fullName, form.firstName, form.surName]);

  const employeeCodeOptions = useMemo(
    () => buildEmployeeCodeOptions(existingEmployees),
    [existingEmployees]
  );

  const recommendedEmployeeCode = employeeCodeOptions[0]?.value || "001";
  const suggestedCodeSummary =
    employeeCodeOptions[0]?.kind === "gap"
      ? `${employeeCodeOptions.length} gap code${employeeCodeOptions.length === 1 ? "" : "s"} available`
      : "No gaps found, next code prepared";

  function updateField(key: string, value: string) {
    setForm((prev) => {
      if (key === "empNo") {
        return { ...prev, empNo: value, fileNo: value };
      }

      return { ...prev, [key]: value };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");

    if (!fullNamePreview) {
      setStatus("Please fill Full Name or First + Sur Name.");
      return;
    }

    setSaving(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, value]) => value.trim() !== "")
      );

      if (!payload.fullName && fullNamePreview) payload.fullName = fullNamePreview;

      const res = await fetch("/api/client/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus(data?.message || "Failed to save employee.");
        setSaving(false);
        return;
      }

      const nextEmployees = await loadExistingEmployees();
      const nextSuggestedCode = buildEmployeeCodeOptions(nextEmployees)[0]?.value || "001";
      setForm(createEmptyForm(nextSuggestedCode));
      setStatus("Employee saved successfully.");
    } catch {
      setStatus("Server error while saving employee.");
    }

    setSaving(false);
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-slate-100">
      <ClientSidebar />

      <main className="flex-1 min-w-0 p-6 md:p-8">
        {moduleEnabled === false ? (
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-blue-950">Page Disabled</h2>
            <p className="mt-2 text-slate-600">This page is not enabled by consultant.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-blue-950">Add New Employee</h1>
                <p className="mt-1 text-slate-600">
                  Fill all new joining employee details in one structured employee record.
                </p>
              </div>

              <div className="grid min-w-[220px] gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-sky-600">
                    Suggested Code
                  </p>
                  <p className="mt-2 text-2xl font-black text-blue-950">{recommendedEmployeeCode}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {loadingCodes ? "Checking employee codes..." : suggestedCodeSummary}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-sky-600">
                    File No Rule
                  </p>
                  <p className="mt-2 text-lg font-bold text-blue-950">Matches Employee Code</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    File No is mirrored automatically from Emp No.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-sky-600">
                    Full Name
                  </p>
                  <p className="mt-2 truncate text-lg font-bold text-blue-950">
                    {fullNamePreview || "-"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Built from Full Name or First + Sur Name.
                  </p>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-md"
            >
              <div className="overflow-hidden rounded-3xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="w-[280px] px-5 py-4 text-left text-[11px] font-bold uppercase tracking-[0.28em]">
                          Field
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-[0.28em]">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {fields.map((field, index) => {
                        const section = getFieldSection(field.key);
                        const previousSection = index > 0 ? getFieldSection(fields[index - 1].key) : null;
                        const showSectionHeader = section !== previousSection;

                        return (
                          <Fragment key={field.key}>
                            {showSectionHeader && (
                              <tr className="bg-slate-950/5">
                                <td colSpan={2} className="px-5 py-3">
                                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-blue-900">
                                    {section}
                                  </p>
                                  <p className="mt-1 text-xs font-semibold text-slate-500">
                                    {sectionDescriptions[section]}
                                  </p>
                                </td>
                              </tr>
                            )}
                            <tr className="align-top bg-white transition-colors hover:bg-blue-50/40">
                              <td className="px-5 py-4 font-semibold text-slate-700">{field.label}</td>
                              <td className="px-5 py-4">
                                {field.key === "empNo" ? (
                                  <div className="space-y-3">
                                    <div className="grid gap-3 xl:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
                                      <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                                        Suggested codes
                                        <select
                                          value={
                                            employeeCodeOptions.some((option) => option.value === form.empNo)
                                              ? form.empNo
                                              : ""
                                          }
                                          onChange={(e) => updateField("empNo", e.target.value)}
                                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
                                        >
                                          <option value="">Choose from available codes</option>
                                          {employeeCodeOptions.map((option) => (
                                            <option key={`${option.scope}-${option.value}`} value={option.value}>
                                              {option.label}
                                            </option>
                                          ))}
                                        </select>
                                      </label>

                                      <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                                        Employee code
                                        <input
                                          type="text"
                                          value={form.empNo}
                                          onChange={(e) => updateField("empNo", e.target.value)}
                                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
                                          placeholder={recommendedEmployeeCode}
                                        />
                                      </label>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-500">
                                      Gap codes from Employee Master Checker appear here first. If no gaps exist, the
                                      next in line code is suggested automatically.
                                    </p>
                                  </div>
                                ) : field.key === "fileNo" ? (
                                  <div className="space-y-2">
                                    <input
                                      type="text"
                                      value={form.fileNo}
                                      readOnly
                                      className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600"
                                    />
                                    <p className="text-xs font-semibold text-slate-500">
                                      File No always mirrors Employee Code on this form.
                                    </p>
                                  </div>
                                ) : field.type === "textarea" ? (
                                  <textarea
                                    value={form[field.key]}
                                    onChange={(e) => updateField(field.key, e.target.value)}
                                    rows={3}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
                                  />
                                ) : field.type === "select" ? (
                                  <select
                                    value={form[field.key]}
                                    onChange={(e) => updateField(field.key, e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
                                  >
                                    {(field.options || []).map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type={field.type === "date" ? "date" : "text"}
                                    value={form[field.key]}
                                    onChange={(e) => updateField(field.key, e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
                                  />
                                )}
                              </td>
                            </tr>
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-2xl bg-yellow-500 px-6 py-3 font-semibold text-blue-950 hover:bg-yellow-400 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Employee"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(createEmptyForm(recommendedEmployeeCode))}
                    className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Reset Form
                  </button>
                </div>
                <p className="text-sm font-semibold text-slate-600">
                  Resolved Full Name: {fullNamePreview || "-"}
                </p>
              </div>

              {status && <p className="mt-4 text-sm font-semibold text-slate-700">{status}</p>}
            </form>
          </>
        )}
      </main>
    </div>
  );
}
