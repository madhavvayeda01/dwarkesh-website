"use client";

import { useEffect, useState } from "react";
import ClientSidebar from "@/components/ClientSidebar";

type Employee = {
  id: string;

  empNo: string | null;
  fileNo: string | null;
  pfNo: string | null;
  uanNo: string | null;
  esicNo: string | null;

  firstName: string | null;
  surName: string | null;
  fatherSpouseName: string | null;
  fullName: string | null;

  designation: string | null;
  currentDept: string | null;
  salaryWage: string | null;

  dob: string | null;
  doj: string | null;
  dor: string | null;
  reasonForExit: string | null;

  panNo: string | null;
  aadharNo: string | null;
  elcIdNo: string | null;
  drivingLicenceNo: string | null;

  bankAcNo: string | null;
  ifscCode: string | null;
  bankName: string | null;

  mobileNumber: string | null;
  gender: string | null;
  religion: string | null;
  nationality: string | null;
  typeOfEmployment: string | null;
  maritalStatus: string | null;
  educationQualification: string | null;
  experienceInRelevantField: string | null;

  presentAddress: string | null;
  permanentAddress: string | null;
  village: string | null;
  thana: string | null;
  subDivision: string | null;
  postOffice: string | null;
  district: string | null;
  state: string | null;
  pinCode: string | null;
  temporaryAddress: string | null;

  nominee1Name: string | null;
  nominee1Relation: string | null;
  nominee1BirthDate: string | null;
  nominee1Age: string | null;
  nominee1Proportion: string | null;

  nominee2Name: string | null;
  nominee2Relation: string | null;
  nominee2BirthDate: string | null;
  nominee2Age: string | null;
  nominee2Proportion: string | null;

  createdAt: string;
};

export default function ClientEmployeesPage() {
  // 🔐 Client login check
  useEffect(() => {
    async function checkLogin() {
      const res = await fetch("/api/client/me");
      const data = await res.json();
      if (!data.loggedIn) window.location.href = "/signin";
    }
    checkLogin();
  }, []);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [file, setFile] = useState<File | null>(null);

  function normalizeHashOnlyValues(list: Employee[]): Employee[] {
    return list.map((employee) => {
      const entries = Object.entries(employee).map(([key, value]) => {
        if (typeof value !== "string") return [key, value];
        const trimmed = value.trim();
        if (/^#+$/.test(trimmed)) return [key, null];
        return [key, value];
      });

      return Object.fromEntries(entries) as Employee;
    });
  }

  async function fetchEmployees() {
    setLoading(true);
    const res = await fetch("/api/client/employees", { cache: "no-store" });
    const data = await res.json();
    setEmployees(normalizeHashOnlyValues(data.employees || []));
    setLoading(false);
  }

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Download Template (CSV for now)
  function downloadTemplate() {
    const headers = [
      "Emp NO.",
      "File No.",
      "PF No.",
      "UAN No.",
      "ESIC No.",
      "First Name",
      "Sur Name",
      "Father/Spouse Name",
      "Full Name",
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

    const csv = [headers].map((r) => r.map((x) => `"${x}"`).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "Employee_Master_Template.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (!file) {
      alert("Please choose a file first");
      return;
    }

    setMsg("Importing file...");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/client/employees/import", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      setMsg(`❌ ${data.message || "Import failed"}`);
      return;
    }

    setMsg(`✅ Imported successfully! (${data.inserted || 0} rows)`);
    setFile(null);
    fetchEmployees();
  }

  async function handleDeleteEmployee(id: string) {
    const ok = confirm("Delete this employee record?");
    if (!ok) return;

    const res = await fetch(`/api/client/employees/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      alert("Failed to delete employee");
      return;
    }

    fetchEmployees();
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-slate-100">
      <ClientSidebar />

      <main className="flex-1 min-w-0 p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-blue-950">
              Employee Master
            </h1>
            <p className="mt-1 text-slate-600">
              Upload employee master Excel/CSV and view all records in one table.
            </p>
          </div>

          <button
            onClick={fetchEmployees}
            className="rounded-2xl bg-blue-900 px-5 py-2 font-semibold text-white hover:bg-blue-800"
          >
            Refresh
          </button>
        </div>

        {/* IMPORT SECTION */}
        <div className="mt-8 rounded-3xl bg-white p-6 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-blue-950">
              Import Employee Master
            </h2>

            <button
              onClick={downloadTemplate}
              className="rounded-2xl bg-yellow-500 px-5 py-2 font-semibold text-blue-950 hover:bg-yellow-400"
            >
              ⬇ Download Template
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full max-w-md rounded-xl border bg-white px-4 py-2 text-slate-900"
            />

            <button
              onClick={handleImport}
              className="rounded-2xl bg-green-600 px-6 py-2 font-semibold text-white hover:bg-green-500"
            >
              📥 Import File
            </button>
          </div>

          {msg && <p className="mt-3 text-sm font-semibold text-slate-700">{msg}</p>}
        </div>

        {/* TABLE VIEW */}
        <div className="mt-10 rounded-3xl bg-white p-6 shadow-md">
          <h2 className="text-xl font-bold text-blue-950">
            All Employees ({employees.length})
          </h2>

          {loading ? (
            <p className="mt-4 text-slate-600">Loading employees...</p>
          ) : employees.length === 0 ? (
            <p className="mt-4 text-slate-600">
              No employees found. Import an Excel/CSV to see data here.
            </p>
          ) : (
            <div className="mt-6 max-w-full overflow-x-auto rounded-2xl border">
              <table className="min-w-[3200px] w-full text-sm text-slate-900">
                <thead className="bg-slate-200 text-slate-700">
                  <tr>
                    <th className="p-3">Emp No</th>
                    <th className="p-3">File No</th>
                    <th className="p-3">PF No</th>
                    <th className="p-3">UAN No</th>
                    <th className="p-3">ESIC No</th>

                    <th className="p-3">First Name</th>
                    <th className="p-3">Sur Name</th>
                    <th className="p-3">Father/Spouse</th>
                    <th className="p-3">Full Name</th>

                    <th className="p-3">Designation</th>
                    <th className="p-3">Dept</th>
                    <th className="p-3">Salary/Wage</th>

                    <th className="p-3">DOB</th>
                    <th className="p-3">DOJ</th>
                    <th className="p-3">DOR</th>
                    <th className="p-3">Exit Reason</th>

                    <th className="p-3">PAN</th>
                    <th className="p-3">Aadhar</th>
                    <th className="p-3">ELC ID</th>
                    <th className="p-3">DL No</th>

                    <th className="p-3">Bank A/c</th>
                    <th className="p-3">IFSC</th>
                    <th className="p-3">Bank Name</th>

                    <th className="p-3">Mobile</th>
                    <th className="p-3">Gender</th>
                    <th className="p-3">Religion</th>
                    <th className="p-3">Nationality</th>
                    <th className="p-3">Employment Type</th>
                    <th className="p-3">Marital</th>
                    <th className="p-3">Education</th>
                    <th className="p-3">Experience</th>

                    <th className="p-3">Present Add.</th>
                    <th className="p-3">Permanent Add.</th>
                    <th className="p-3">Village</th>
                    <th className="p-3">Thana</th>
                    <th className="p-3">Sub-Div</th>
                    <th className="p-3">Post Office</th>
                    <th className="p-3">District</th>
                    <th className="p-3">State</th>
                    <th className="p-3">Pin</th>
                    <th className="p-3">Temporary Add.</th>

                    <th className="p-3">Nominee1</th>
                    <th className="p-3">Relation1</th>
                    <th className="p-3">DOB1</th>
                    <th className="p-3">Age1</th>
                    <th className="p-3">Share1</th>

                    <th className="p-3">Nominee2</th>
                    <th className="p-3">Relation2</th>
                    <th className="p-3">DOB2</th>
                    <th className="p-3">Age2</th>
                    <th className="p-3">Share2</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>

                <tbody className="text-slate-900">
                  {employees.map((e) => (
                    <tr key={e.id} className="border-t hover:bg-slate-50">
                      <td className="p-3">{e.empNo || "-"}</td>
                      <td className="p-3">{e.fileNo || "-"}</td>
                      <td className="p-3">{e.pfNo || "-"}</td>
                      <td className="p-3">{e.uanNo || "-"}</td>
                      <td className="p-3">{e.esicNo || "-"}</td>

                      <td className="p-3">{e.firstName || "-"}</td>
                      <td className="p-3">{e.surName || "-"}</td>
                      <td className="p-3">{e.fatherSpouseName || "-"}</td>
                      <td className="p-3 font-semibold text-blue-950">
                        {e.fullName || "-"}
                      </td>

                      <td className="p-3">{e.designation || "-"}</td>
                      <td className="p-3">{e.currentDept || "-"}</td>
                      <td className="p-3">{e.salaryWage || "-"}</td>

                      <td className="p-3">{e.dob || "-"}</td>
                      <td className="p-3">{e.doj || "-"}</td>
                      <td className="p-3">{e.dor || "-"}</td>
                      <td className="p-3">{e.reasonForExit || "-"}</td>

                      <td className="p-3">{e.panNo || "-"}</td>
                      <td className="p-3">{e.aadharNo || "-"}</td>
                      <td className="p-3">{e.elcIdNo || "-"}</td>
                      <td className="p-3">{e.drivingLicenceNo || "-"}</td>

                      <td className="p-3">{e.bankAcNo || "-"}</td>
                      <td className="p-3">{e.ifscCode || "-"}</td>
                      <td className="p-3">{e.bankName || "-"}</td>

                      <td className="p-3">{e.mobileNumber || "-"}</td>
                      <td className="p-3">{e.gender || "-"}</td>
                      <td className="p-3">{e.religion || "-"}</td>
                      <td className="p-3">{e.nationality || "-"}</td>
                      <td className="p-3">{e.typeOfEmployment || "-"}</td>
                      <td className="p-3">{e.maritalStatus || "-"}</td>
                      <td className="p-3">{e.educationQualification || "-"}</td>
                      <td className="p-3">{e.experienceInRelevantField || "-"}</td>

                      <td className="p-3">{e.presentAddress || "-"}</td>
                      <td className="p-3">{e.permanentAddress || "-"}</td>
                      <td className="p-3">{e.village || "-"}</td>
                      <td className="p-3">{e.thana || "-"}</td>
                      <td className="p-3">{e.subDivision || "-"}</td>
                      <td className="p-3">{e.postOffice || "-"}</td>
                      <td className="p-3">{e.district || "-"}</td>
                      <td className="p-3">{e.state || "-"}</td>
                      <td className="p-3">{e.pinCode || "-"}</td>
                      <td className="p-3">{e.temporaryAddress || "-"}</td>

                      <td className="p-3">{e.nominee1Name || "-"}</td>
                      <td className="p-3">{e.nominee1Relation || "-"}</td>
                      <td className="p-3">{e.nominee1BirthDate || "-"}</td>
                      <td className="p-3">{e.nominee1Age || "-"}</td>
                      <td className="p-3">{e.nominee1Proportion || "-"}</td>

                      <td className="p-3">{e.nominee2Name || "-"}</td>
                      <td className="p-3">{e.nominee2Relation || "-"}</td>
                      <td className="p-3">{e.nominee2BirthDate || "-"}</td>
                      <td className="p-3">{e.nominee2Age || "-"}</td>
                      <td className="p-3">{e.nominee2Proportion || "-"}</td>

                      <td className="p-3">
                        <button
                          onClick={() => handleDeleteEmployee(e.id)}
                          className="rounded-xl bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-400"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-3 text-xs text-slate-500">
            👉 Scroll horizontally to view all columns.
          </p>
        </div>
      </main>
    </div>
  );
}
