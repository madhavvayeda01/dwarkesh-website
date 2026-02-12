"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Employee = {
  id: string;
  fullName: string;
  employeeCode: string | null;
  department: string | null;
  designation: string | null;
  phone: string | null;
  email: string | null;
  joiningDate: string | null;
  status: string;
  address: string | null;
  createdAt: string;
};

export default function AdminEmployeesPage() {
  // 🔐 Admin login check
  useEffect(() => {
    async function checkLogin() {
      const res = await fetch("/api/admin/me");
      const data = await res.json();

      if (!data.loggedIn) {
        window.location.href = "/signin";
      }
    }

    checkLogin();
  }, []);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [fullName, setFullName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [address, setAddress] = useState("");

  // UI states
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  async function fetchEmployees() {
    setLoading(true);
    const res = await fetch("/api/admin/employees");
    const data = await res.json();

    setEmployees(data.employees || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    let list = [...employees];

    if (search.trim()) {
      const q = search.toLowerCase();

      list = list.filter((e) => {
        return (
          e.fullName.toLowerCase().includes(q) ||
          (e.employeeCode || "").toLowerCase().includes(q) ||
          (e.department || "").toLowerCase().includes(q) ||
          (e.designation || "").toLowerCase().includes(q) ||
          (e.phone || "").toLowerCase().includes(q) ||
          (e.email || "").toLowerCase().includes(q) ||
          (e.status || "").toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [employees, search]);

  async function handleCreateEmployee(e: React.FormEvent) {
    e.preventDefault();
    setMessage("Saving employee...");

    const res = await fetch("/api/admin/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        employeeCode,
        department,
        designation,
        phone,
        email,
        joiningDate,
        status,
        address,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(`❌ ${data.message || "Failed to create employee"}`);
      return;
    }

    setMessage("✅ Employee added successfully!");
    setFullName("");
    setEmployeeCode("");
    setDepartment("");
    setDesignation("");
    setPhone("");
    setEmail("");
    setJoiningDate("");
    setStatus("Active");
    setAddress("");

    fetchEmployees();
  }

  async function handleDeleteEmployee(id: string) {
    const ok = confirm("Delete this employee?");
    if (!ok) return;

    const res = await fetch(`/api/admin/employees/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      fetchEmployees();
    } else {
      alert("Failed to delete employee");
    }
  }

  function exportCSV() {
    const headers = [
      "Full Name",
      "Employee Code",
      "Department",
      "Designation",
      "Phone",
      "Email",
      "Joining Date",
      "Status",
      "Address",
      "Created At",
    ];

    const rows = filteredEmployees.map((e) => [
      e.fullName,
      e.employeeCode || "-",
      e.department || "-",
      e.designation || "-",
      e.phone || "-",
      e.email || "-",
      e.joiningDate ? new Date(e.joiningDate).toLocaleDateString() : "-",
      e.status,
      (e.address || "-").replace(/\n/g, " "),
      new Date(e.createdAt).toLocaleString(),
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `employees_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-blue-950 md:text-4xl">
                Employee Master
              </h1>
              <p className="mt-2 text-slate-600">
                Add & manage employee master records.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={exportCSV}
                className="rounded-2xl bg-yellow-500 px-5 py-2 font-semibold text-blue-950 hover:bg-yellow-400"
              >
                Export CSV
              </button>

              <button
                onClick={fetchEmployees}
                className="rounded-2xl bg-blue-900 px-5 py-2 font-semibold text-white hover:bg-blue-800"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* CREATE EMPLOYEE */}
          <form
            onSubmit={handleCreateEmployee}
            className="mt-8 rounded-3xl bg-white p-8 shadow-md"
          >
            <h2 className="text-xl font-bold text-blue-950">
              Add New Employee
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">
                  Full Name *
                </label>
                <input
                  className="mt-1 w-full rounded-xl border px-4 py-3"
                  placeholder="Enter employee full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Employee Code
                </label>
                <input
                  className="mt-1 w-full rounded-xl border px-4 py-3"
                  placeholder="EMP001"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Department
                </label>
                <input
                  className="mt-1 w-full rounded-xl border px-4 py-3"
                  placeholder="HR / Accounts / Production"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Designation
                </label>
                <input
                  className="mt-1 w-full rounded-xl border px-4 py-3"
                  placeholder="HR Executive"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Status
                </label>
                <select
                  className="mt-1 w-full rounded-xl border px-4 py-3"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "Active" | "Inactive")
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Joining Date
                </label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border px-4 py-3"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Phone
                </label>
                <input
                  className="mt-1 w-full rounded-xl border px-4 py-3"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  className="mt-1 w-full rounded-xl border px-4 py-3"
                  placeholder="employee@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="md:col-span-3">
                <label className="text-sm font-semibold text-slate-700">
                  Address
                </label>
                <textarea
                  className="mt-1 w-full rounded-xl border px-4 py-3"
                  placeholder="Enter address"
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-6 w-full rounded-2xl bg-yellow-500 px-6 py-3 font-semibold text-blue-950 hover:bg-yellow-400"
            >
              Save Employee
            </button>

            {message && (
              <p className="mt-3 text-sm font-semibold text-slate-700">
                {message}
              </p>
            )}
          </form>

          {/* EMPLOYEE LIST */}
          <div className="mt-10 rounded-3xl bg-white p-6 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-blue-950">
                Employees ({filteredEmployees.length})
              </h2>

              <input
                className="w-full max-w-sm rounded-xl border px-4 py-2 text-sm"
                placeholder="Search name / code / department / phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {loading ? (
              <p className="mt-6 text-slate-600">Loading employees...</p>
            ) : filteredEmployees.length === 0 ? (
              <p className="mt-6 text-slate-600">No employees found.</p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-200 text-left text-slate-700">
                      <th className="p-3">Name</th>
                      <th className="p-3">Code</th>
                      <th className="p-3">Dept</th>
                      <th className="p-3">Designation</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredEmployees.map((emp) => (
                      <tr key={emp.id} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-semibold text-blue-950">
                          {emp.fullName}
                        </td>
                        <td className="p-3 text-slate-700">
                          {emp.employeeCode || "-"}
                        </td>
                        <td className="p-3 text-slate-700">
                          {emp.department || "-"}
                        </td>
                        <td className="p-3 text-slate-700">
                          {emp.designation || "-"}
                        </td>
                        <td className="p-3 text-slate-700">{emp.phone || "-"}</td>
                        <td className="p-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              emp.status === "Active"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {emp.status}
                          </span>
                        </td>

                        <td className="p-3">
                          <button
                            onClick={() => handleDeleteEmployee(emp.id)}
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
          </div>
        </section>
      </main>
    </div>
  );
}
