"use client";

import { useEffect, useMemo, useState } from "react";
import ClientSidebar from "@/components/ClientSidebar";

type FieldType = "text" | "date" | "textarea" | "select";

type FieldConfig = {
  key: string;
  label: string;
  type?: FieldType;
  options?: string[];
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

const emptyForm = Object.fromEntries(
  fields.map((field) => [field.key, field.key === "employmentStatus" ? "ACTIVE" : ""])
) as Record<string, string>;

export default function AddNewEmployeePage() {
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [moduleEnabled, setModuleEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkLogin() {
      const res = await fetch("/api/client/me");
      const data = await res.json();
      const loggedIn = data?.data?.loggedIn ?? data?.loggedIn ?? false;
      if (!loggedIn) window.location.href = "/signin";
      const accessRes = await fetch("/api/client/modules?page=add_employee", { cache: "no-store" });
      const accessData = await accessRes.json().catch(() => ({}));
      setModuleEnabled(accessRes.ok ? accessData?.data?.enabled !== false : true);
    }
    checkLogin();
  }, []);

  const fullNamePreview = useMemo(() => {
    if (form.fullName.trim()) return form.fullName.trim();
    return [form.firstName.trim(), form.surName.trim()].filter(Boolean).join(" ");
  }, [form.fullName, form.firstName, form.surName]);

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
      const data = await res.json();

      if (!res.ok) {
        setStatus(data?.message || "Failed to save employee.");
        setSaving(false);
        return;
      }

      setStatus("Employee saved successfully.");
      setForm(emptyForm);
    } catch {
      setStatus("Server error while saving employee.");
    }
    setSaving(false);
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-slate-100">
      <ClientSidebar />

      <main className="flex-1 min-w-0 p-8">
        {moduleEnabled === false ? (
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-blue-950">Page Disabled</h2>
            <p className="mt-2 text-slate-600">This page is not enabled by consultant.</p>
          </div>
        ) : (
          <>
        <h1 className="text-3xl font-extrabold text-blue-950">Add New Employee</h1>
        <p className="mt-1 text-slate-600">
          Fill all new joining employee details in tabular form.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 rounded-3xl bg-white p-6 shadow-md">
          <div className="overflow-x-auto rounded-2xl border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-200 text-slate-700">
                <tr>
                  <th className="p-3 text-left">Field</th>
                  <th className="p-3 text-left">Value</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field) => (
                  <tr key={field.key} className="border-t">
                    <td className="p-3 font-semibold text-slate-700">{field.label}</td>
                    <td className="p-3">
                      {field.type === "textarea" ? (
                        <textarea
                          value={form[field.key]}
                          onChange={(e) => updateField(field.key, e.target.value)}
                          rows={2}
                          className="w-full rounded-xl border bg-white px-3 py-2 text-slate-900"
                        />
                      ) : field.type === "select" ? (
                        <select
                          value={form[field.key]}
                          onChange={(e) => updateField(field.key, e.target.value)}
                          className="w-full rounded-xl border bg-white px-3 py-2 text-slate-900"
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
                          className="w-full rounded-xl border bg-white px-3 py-2 text-slate-900"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-yellow-500 px-6 py-3 font-semibold text-blue-950 hover:bg-yellow-400 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Employee"}
            </button>
            <p className="text-sm text-slate-600">Resolved Full Name: {fullNamePreview || "-"}</p>
          </div>

          {status && <p className="mt-3 text-sm font-semibold text-slate-700">{status}</p>}
        </form>
          </>
        )}
      </main>
    </div>
  );
}



