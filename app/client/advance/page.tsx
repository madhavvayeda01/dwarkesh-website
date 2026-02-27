"use client";

import { useEffect, useMemo, useState } from "react";
import ClientSidebar from "@/components/ClientSidebar";

type Employee = {
  id: string;
  empNo: string | null;
  fullName: string | null;
  currentDept: string | null;
  designation: string | null;
  salaryWage: string | null;
  bankAcNo: string | null;
  ifscCode: string | null;
  bankName: string | null;
};

type AdvanceRow = {
  id: string;
  empNo: string;
  name: string;
  department: string;
  designation: string;
  rateOfPay: number;
  presentDay: number;
  accountNo: string;
  ifsc: string;
  bankName: string;
};

type AdvanceComputedRow = AdvanceRow & {
  advance: number;
};

type AdvanceColumnKey =
  | "empNo"
  | "name"
  | "department"
  | "designation"
  | "rateOfPay"
  | "presentDay"
  | "advance"
  | "accountNo"
  | "ifsc"
  | "bankName";

const ADVANCE_COLUMNS: Array<{ key: AdvanceColumnKey; label: string }> = [
  { key: "empNo", label: "Emp No" },
  { key: "name", label: "Name" },
  { key: "department", label: "Department" },
  { key: "designation", label: "Designation" },
  { key: "rateOfPay", label: "Rate of pay" },
  { key: "presentDay", label: "Present day" },
  { key: "advance", label: "Advance" },
  { key: "accountNo", label: "Account No." },
  { key: "ifsc", label: "IFSC" },
  { key: "bankName", label: "Bank Name" },
];

function toNumber(value: string | null | undefined, fallback = 0): number {
  if (!value) return fallback;
  const normalized = String(value).replace(/,/g, "").trim();
  if (!normalized) return fallback;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : fallback;
}

function money(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString("en-IN") : "0";
}

function roundUp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.ceil(value);
}

export default function ClientAdvancePage() {
  const [moduleEnabled, setModuleEnabled] = useState<boolean | null>(null);
  const [rows, setRows] = useState<AdvanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [empSortOrder, setEmpSortOrder] = useState<"none" | "asc" | "desc">("none");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [designationFilter, setDesignationFilter] = useState("ALL");
  const [columnSearch, setColumnSearch] = useState<Partial<Record<AdvanceColumnKey, string>>>({});
  const now = new Date();
  const [advanceMonth, setAdvanceMonth] = useState(now.getMonth());
  const [advanceYear, setAdvanceYear] = useState(now.getFullYear());

  useEffect(() => {
    async function checkLogin() {
      const res = await fetch("/api/client/me");
      const data = await res.json();
      const loggedIn = data?.data?.loggedIn ?? data?.loggedIn ?? false;
      if (!loggedIn) window.location.href = "/signin";
      const accessRes = await fetch("/api/client/modules?module=payroll", { cache: "no-store" });
      const accessData = await accessRes.json().catch(() => ({}));
      if (!accessRes.ok || !accessData?.data?.enabled) {
        setModuleEnabled(false);
        setLoading(false);
        return false;
      }
      setModuleEnabled(true);
      return true;
    }

    async function loadEmployees() {
      setLoading(true);
      const res = await fetch("/api/client/employees", { cache: "no-store" });
      const data = await res.json();
      const payload = data?.data ?? data;
      const employees: Employee[] = payload?.employees || [];

      setRows(
        employees.map((employee) => ({
          id: employee.id,
          empNo: employee.empNo || "",
          name: employee.fullName || "",
          department: employee.currentDept || "",
          designation: employee.designation || "",
          rateOfPay: toNumber(employee.salaryWage, 0),
          presentDay: 0,
          accountNo: employee.bankAcNo || "",
          ifsc: employee.ifscCode || "",
          bankName: employee.bankName || "",
        }))
      );
      setLoading(false);
    }

    async function init() {
      const canLoad = await checkLogin();
      if (!canLoad) return;
      await loadEmployees();
    }

    init();
  }, []);

  function updatePresentDay(id: string, value: number) {
    const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, presentDay: safe } : row))
    );
  }

  const computed = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        advance: roundUp(row.rateOfPay * row.presentDay),
      })),
    [rows]
  );

  function displayValue(row: AdvanceComputedRow, key: AdvanceColumnKey): string {
    if (key === "rateOfPay") return money(row.rateOfPay);
    if (key === "advance") return money(row.advance);
    if (key === "presentDay") return row.presentDay.toFixed(2);
    return String(row[key] || "");
  }

  function comparableValue(row: AdvanceComputedRow, key: AdvanceColumnKey): string {
    return displayValue(row, key).toLowerCase();
  }

  const departmentOptions = useMemo(() => {
    const values = Array.from(
      new Set(rows.map((row) => row.department.trim()).filter(Boolean))
    );
    return values.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [rows]);

  const designationOptions = useMemo(() => {
    const values = Array.from(
      new Set(rows.map((row) => row.designation.trim()).filter(Boolean))
    );
    return values.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [rows]);

  const filteredComputed = useMemo(() => {
    const globalNeedle = globalSearch.trim().toLowerCase();
    const filtered = computed.filter((row) => {
      if (departmentFilter !== "ALL" && row.department.trim() !== departmentFilter) return false;
      if (designationFilter !== "ALL" && row.designation.trim() !== designationFilter) return false;

      const perColumnMatch = ADVANCE_COLUMNS.every((column) => {
        const needle = (columnSearch[column.key] || "").trim().toLowerCase();
        if (!needle) return true;
        return comparableValue(row, column.key).includes(needle);
      });
      if (!perColumnMatch) return false;

      if (!globalNeedle) return true;
      return ADVANCE_COLUMNS.some((column) => comparableValue(row, column.key).includes(globalNeedle));
    });

    if (empSortOrder === "none") return filtered;
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      const left = a.empNo.trim();
      const right = b.empNo.trim();
      if (!left && !right) return 0;
      if (!left) return 1;
      if (!right) return -1;
      const cmp = left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
      return empSortOrder === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [computed, globalSearch, departmentFilter, designationFilter, columnSearch, empSortOrder]);

  const grandTotal = useMemo(
    () =>
      filteredComputed.reduce(
        (acc, row) => {
          acc.rateOfPay += row.rateOfPay;
          acc.presentDay += row.presentDay;
          acc.advance += row.advance;
          return acc;
        },
        { rateOfPay: 0, presentDay: 0, advance: 0 }
      ),
    [filteredComputed]
  );

  const monthOptions = [
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

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, index) => current - 5 + index);
  }, []);

  async function generateAdvance() {
    setStatus("Generating advance file...");
    try {
      const payload = {
        month: advanceMonth,
        year: advanceYear,
        rows: computed.map((row) => ({
          empNo: row.empNo || "",
          name: row.name || "",
          department: row.department || "",
          designation: row.designation || "",
          rateOfPay: row.rateOfPay,
          presentDay: row.presentDay,
          advance: row.advance,
          accountNo: row.accountNo || "",
          ifsc: row.ifsc || "",
          bankName: row.bankName || "",
        })),
      };

      const res = await fetch("/api/client/advance/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus(data?.message || "Failed to generate advance.");
        return;
      }

      setStatus("Advance generated and saved. Open Salary > Advance Data to export.");
    } catch {
      setStatus("Failed to generate advance.");
    }
  }

  async function exportAdvanceData() {
    const res = await fetch("/api/client/advance/data", { cache: "no-store" });
    if (!res.ok) {
      setStatus("Failed to export advance data.");
      return;
    }

    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const fileNameMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
    const fileName = fileNameMatch?.[1] || `advance_data_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Advance data exported.");
  }

  async function importAdvanceData() {
    if (!importFile) {
      setStatus("Please choose a file first.");
      return;
    }

    setStatus("Importing advance data...");
    const formData = new FormData();
    formData.append("file", importFile);

    const res = await fetch("/api/client/advance/data", {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data?.message || "Failed to import advance data.");
      return;
    }

    const payload = data?.data ?? data;
    const importedRows: AdvanceRow[] = payload?.rows || [];
    if (importedRows.length > 0) {
      setRows(
        importedRows.map((row) => ({
          ...row,
          presentDay: Number.isFinite(row.presentDay) ? row.presentDay : 0,
          rateOfPay: Number.isFinite(row.rateOfPay) ? row.rateOfPay : 0,
        }))
      );
    }
    setImportFile(null);
    setStatus("Advance data imported.");
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <ClientSidebar />
      <main className="flex-1 p-8">
        {moduleEnabled === false ? (
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-blue-950">Module Disabled</h2>
            <p className="mt-2 text-slate-600">Module not enabled by consultant.</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-blue-950">Advance</h1>
            <p className="mt-2 text-slate-600">
              Add Present day for each employee. Advance is auto-calculated as
              <span className="font-semibold"> Rate of pay × Present day</span>.
            </p>

            <div className="mt-5 flex flex-wrap items-end gap-4 rounded-2xl bg-white p-4 shadow">
              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                Advance Month
                <select
                  value={advanceMonth}
                  onChange={(e) => setAdvanceMonth(Number(e.target.value))}
                  className="rounded-xl border border-slate-300 px-3 py-2"
                >
                  {monthOptions.map((month, index) => (
                    <option key={month} value={index}>
                      {month}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                Advance Year
                <select
                  value={advanceYear}
                  onChange={(e) => setAdvanceYear(Number(e.target.value))}
                  className="rounded-xl border border-slate-300 px-3 py-2"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>

              <button
                onClick={generateAdvance}
                className="rounded-2xl bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-500"
              >
                Generate Advance
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow">
              <input
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search all fields..."
                className="w-full min-w-[220px] max-w-[340px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              />

              <select
                value={empSortOrder}
                onChange={(e) => setEmpSortOrder(e.target.value as "none" | "asc" | "desc")}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="none">Emp Code: No Sort</option>
                <option value="asc">Emp Code: Smallest to Largest</option>
                <option value="desc">Emp Code: Largest to Smallest</option>
              </select>

              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="ALL">Department: All</option>
                {departmentOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                value={designationFilter}
                onChange={(e) => setDesignationFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="ALL">Designation: All</option>
                {designationOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  setGlobalSearch("");
                  setEmpSortOrder("none");
                  setDepartmentFilter("ALL");
                  setDesignationFilter("ALL");
                  setColumnSearch({});
                }}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>

            {status && <p className="mt-3 text-sm font-semibold text-slate-700">{status}</p>}

            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow">
              <button
                onClick={exportAdvanceData}
                className="rounded-2xl bg-yellow-500 px-5 py-2 font-semibold text-blue-950 hover:bg-yellow-400"
              >
                Employee data
              </button>

              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full max-w-md rounded-xl border bg-white px-4 py-2 text-slate-900"
              />

              <button
                onClick={importAdvanceData}
                className="rounded-2xl bg-blue-900 px-5 py-2 font-semibold text-white hover:bg-blue-800"
              >
                Import Filled Data
              </button>
            </div>

            {loading ? (
              <p className="mt-6 text-slate-600">Loading employees...</p>
            ) : (
              <div className="mt-6 overflow-x-auto rounded-2xl border bg-white shadow">
                <table className="min-w-[1400px] w-full text-sm">
                  <thead className="bg-slate-200 text-slate-800">
                    <tr>
                      {ADVANCE_COLUMNS.map((column) => (
                        <th key={column.key} className="p-3 text-left">
                          {column.label}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {ADVANCE_COLUMNS.map((column) => (
                        <th key={`${column.key}-search`} className="p-2 text-left">
                          <input
                            value={columnSearch[column.key] || ""}
                            onChange={(e) =>
                              setColumnSearch((prev) => ({ ...prev, [column.key]: e.target.value }))
                            }
                            placeholder="Search..."
                            className="w-full min-w-[120px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
                          />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComputed.map((row, index) => (
                      <tr key={row.id || `${row.empNo}-${index}`} className="border-t">
                        <td className="p-3">{row.empNo || "-"}</td>
                        <td className="p-3 font-semibold text-blue-950">{row.name || "-"}</td>
                        <td className="p-3">{row.department || "-"}</td>
                        <td className="p-3">{row.designation || "-"}</td>
                        <td className="p-3">{money(row.rateOfPay)}</td>
                        <td className="p-3">
                          <input
                            type="number"
                            min={0}
                            step="0.5"
                            value={row.presentDay}
                            onChange={(e) => updatePresentDay(row.id, Number(e.target.value))}
                            className="w-28 rounded-lg border border-slate-300 px-2 py-1"
                          />
                        </td>
                        <td className="p-3 font-semibold text-emerald-700">{money(row.advance)}</td>
                        <td className="p-3">{row.accountNo || "-"}</td>
                        <td className="p-3">{row.ifsc || "-"}</td>
                        <td className="p-3">{row.bankName || "-"}</td>
                      </tr>
                    ))}
                    {filteredComputed.length === 0 && (
                      <tr>
                        <td colSpan={10} className="p-4 text-center text-slate-600">
                          No records match current filters.
                        </td>
                      </tr>
                    )}
                    {filteredComputed.length > 0 && (
                      <tr className="border-t-2 bg-slate-100 font-bold text-slate-900">
                        <td className="p-3" colSpan={4}>
                          Grand Total
                        </td>
                        <td className="p-3">{money(grandTotal.rateOfPay)}</td>
                        <td className="p-3">{grandTotal.presentDay.toFixed(2)}</td>
                        <td className="p-3 text-emerald-700">{money(grandTotal.advance)}</td>
                        <td className="p-3">-</td>
                        <td className="p-3">-</td>
                        <td className="p-3">-</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
