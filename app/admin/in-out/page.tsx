"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";

type ClientItem = {
  id: string;
  name: string;
};

type PayrollPreviewEmployee = {
  employeeId: string;
  empCode: string;
  employeeName: string;
  payDays: number;
  otHoursTarget: number;
};

type PreviewPayload = {
  employees: PayrollPreviewEmployee[];
  totalDaysInMonth: number;
  holidays: string[];
};

function toClientList(raw: unknown): ClientItem[] {
  if (!raw || typeof raw !== "object") return [];
  const payload = (raw as { data?: unknown }).data ?? raw;
  const list =
    (payload as { clients?: unknown[] }).clients ??
    (Array.isArray(payload) ? payload : []);
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      const row = item as { id?: unknown; name?: unknown };
      if (typeof row.id !== "string" || typeof row.name !== "string") return null;
      return { id: row.id, name: row.name };
    })
    .filter((item): item is ClientItem => Boolean(item));
}

function toPreviewPayload(raw: unknown): PreviewPayload {
  const payload = (raw as { data?: unknown })?.data ?? raw;
  const employeesRaw = (payload as { employees?: unknown[] })?.employees;
  const holidaysRaw = (payload as { holidays?: unknown[] })?.holidays;

  const employees = Array.isArray(employeesRaw)
    ? employeesRaw
        .map((row) => {
          const item = row as {
            employeeId?: unknown;
            empCode?: unknown;
            employeeName?: unknown;
            payDays?: unknown;
            otHoursTarget?: unknown;
          };
          if (typeof item.employeeId !== "string") return null;
          return {
            employeeId: item.employeeId,
            empCode: typeof item.empCode === "string" ? item.empCode : "",
            employeeName: typeof item.employeeName === "string" ? item.employeeName : "",
            payDays: Number(item.payDays || 0),
            otHoursTarget: Number(item.otHoursTarget || 0),
          };
        })
        .filter((item): item is PayrollPreviewEmployee => Boolean(item))
    : [];

  const holidays = Array.isArray(holidaysRaw)
    ? holidaysRaw.filter((h): h is string => typeof h === "string")
    : [];

  return {
    employees,
    totalDaysInMonth: Number((payload as { totalDaysInMonth?: unknown })?.totalDaysInMonth || 0),
    holidays,
  };
}

export default function AdminInOutPage() {
  const now = new Date();
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [clientId, setClientId] = useState("");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [status, setStatus] = useState("");
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [preview, setPreview] = useState<PreviewPayload>({
    employees: [],
    totalDaysInMonth: 0,
    holidays: [],
  });

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 2, current - 1, current, current + 1, current + 2];
  }, []);

  useEffect(() => {
    async function loadClients() {
      setLoadingClients(true);
      setStatus("");

      try {
        const res = await fetch("/api/admin/clients-list", {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus((data as { message?: string })?.message || "Failed to load clients.");
          setClients([]);
          return;
        }

        const list = toClientList(data);
        setClients(list);
        setClientId((prev) => prev || list[0]?.id || "");
      } catch {
        setStatus("Failed to load clients.");
        setClients([]);
      } finally {
        setLoadingClients(false);
      }
    }

    loadClients();
  }, []);

  async function handleLoadPayroll() {
    if (!clientId) {
      setStatus("Please select a client.");
      return;
    }

    setLoadingPreview(true);
    setPreviewLoaded(false);
    setStatus("");

    try {
      const query = new URLSearchParams({
        clientId,
        month: String(month),
        year: String(year),
      });

      const res = await fetch(`/api/admin/in-out/preview?${query.toString()}`, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setPreview({ employees: [], totalDaysInMonth: 0, holidays: [] });
        setStatus((data as { message?: string })?.message || "Failed to load payroll preview.");
        return;
      }

      const parsed = toPreviewPayload(data);
      setPreview(parsed);
      setStatus("");
    } catch {
      setPreview({ employees: [], totalDaysInMonth: 0, holidays: [] });
      setStatus("Failed to load payroll preview.");
    } finally {
      setPreviewLoaded(true);
      setLoadingPreview(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <main className="flex-1 p-8 text-slate-900">
        <h1 className="text-3xl font-extrabold text-blue-950">Admin IN-OUT</h1>
        <p className="mt-2 text-slate-600">Load payroll preview by client, month, and year.</p>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-bold text-slate-900">Section 1 - Filters</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-semibold text-slate-700">Client</label>
              <select
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={loadingClients || clients.length === 0}
              >
                <option value="">{loadingClients ? "Loading clients..." : "Select client"}</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">Month</label>
              <select
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">Year</label>
              <select
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleLoadPayroll}
                disabled={loadingClients || loadingPreview || !clientId}
                className="w-full rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loadingPreview ? "Loading..." : "Load Payroll"}
              </button>
            </div>
          </div>

          {status ? <p className="mt-3 text-sm font-semibold text-red-700">{status}</p> : null}
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-bold text-slate-900">Section 2 - Payroll Preview Table</h2>

          {loadingPreview ? <p className="mt-4 text-sm text-slate-600">Loading payroll preview...</p> : null}

          {!loadingPreview && previewLoaded && preview.employees.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No payroll employees found for selected filters.</p>
          ) : null}

          {!loadingPreview && preview.employees.length > 0 ? (
            <>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-700">
                <p>
                  <span className="font-semibold">Total Days In Month:</span> {preview.totalDaysInMonth}
                </p>
                <p>
                  <span className="font-semibold">Holidays:</span> {preview.holidays.length}
                </p>
              </div>

              <div className="mt-4 overflow-auto rounded-xl border">
                <table className="w-full min-w-[800px] border-collapse">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border px-3 py-2 text-left text-sm">Emp Code</th>
                      <th className="border px-3 py-2 text-left text-sm">Employee Name</th>
                      <th className="border px-3 py-2 text-left text-sm">Payroll PayDays</th>
                      <th className="border px-3 py-2 text-left text-sm">Payroll OT Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.employees.map((employee) => (
                      <tr key={employee.employeeId}>
                        <td className="border px-3 py-2 text-sm">{employee.empCode}</td>
                        <td className="border px-3 py-2 text-sm">{employee.employeeName}</td>
                        <td className="border px-3 py-2 text-sm">{employee.payDays}</td>
                        <td className="border px-3 py-2 text-sm">{employee.otHoursTarget}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}
