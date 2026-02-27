"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ClientSidebar from "@/components/ClientSidebar";

type InOutRow = {
  srNo: number;
  empCode: string;
  employeeName: string;
  totals: {
    p: number;
    a: number;
    w: number;
    h: number;
    payDays: number;
    totalWorkHours: number;
    totalOtHours: number;
  };
};

export default function ClientInOutDataPage() {
  const [moduleEnabled, setModuleEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<InOutRow[]>([]);
  const today = new Date();
  const [month, setMonth] = useState<number>(today.getMonth());
  const [year, setYear] = useState<number>(today.getFullYear());

  const MONTHS = [
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
    return Array.from({ length: 11 }, (_, i) => current - 5 + i);
  }, []);

  const loadRows = useCallback(async (targetMonth = month, targetYear = year) => {
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch(`/api/client/in-out?month=${targetMonth + 1}&year=${targetYear}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      const payload = data?.data ?? data;
      if (!res.ok) {
        setRows([]);
        setStatus(data?.message || "Failed to fetch IN-OUT data.");
        setLoading(false);
        return;
      }
      setRows((payload?.rows || []) as InOutRow[]);
    } catch {
      setRows([]);
      setStatus("Failed to fetch IN-OUT data.");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    async function init() {
      const me = await fetch("/api/client/me");
      const meData = await me.json().catch(() => ({}));
      const loggedIn = meData?.data?.loggedIn ?? meData?.loggedIn ?? false;
      if (!loggedIn) {
        window.location.href = "/signin";
        return;
      }

      const accessRes = await fetch("/api/client/modules?module=in_out", { cache: "no-store" });
      const accessData = await accessRes.json().catch(() => ({}));
      if (!accessRes.ok || !accessData?.data?.enabled) {
        setModuleEnabled(false);
        setLoading(false);
        return;
      }
      setModuleEnabled(true);
      await loadRows();
    }
    init();
  }, [loadRows]);

  useEffect(() => {
    if (moduleEnabled !== true) return;
    loadRows(month, year);
  }, [moduleEnabled, month, year, loadRows]);

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
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-blue-950">IN-OUT Data</h1>
                <p className="mt-1 text-slate-600">Generated IN-OUT summary by month.</p>
              </div>
              <button
                onClick={() => loadRows()}
                className="rounded-xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Refresh
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow">
              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                Month
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="rounded-xl border border-slate-300 px-3 py-2"
                >
                  {MONTHS.map((label, idx) => (
                    <option key={label} value={idx}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                Year
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="rounded-xl border border-slate-300 px-3 py-2"
                >
                  {yearOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {status && <p className="mt-3 text-sm font-semibold text-slate-700">{status}</p>}

            <div className="mt-6 rounded-2xl bg-white p-6 shadow">
              {loading ? (
                <p className="text-sm text-slate-600">Loading IN-OUT data...</p>
              ) : rows.length === 0 ? (
                <p className="text-sm text-slate-600">No data found for selected month/year.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-sm text-slate-900">
                    <thead className="bg-slate-200 text-left text-slate-700">
                      <tr>
                        <th className="p-3">Sr #</th>
                        <th className="p-3">Emp Code</th>
                        <th className="p-3">Employee Name</th>
                        <th className="p-3">P</th>
                        <th className="p-3">A</th>
                        <th className="p-3">W</th>
                        <th className="p-3">H</th>
                        <th className="p-3">Pay Days</th>
                        <th className="p-3">Work Hrs</th>
                        <th className="p-3">OT Hrs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={`${row.empCode}-${row.srNo}`} className="border-t">
                          <td className="p-3">{row.srNo}</td>
                          <td className="p-3">{row.empCode || "-"}</td>
                          <td className="p-3 font-semibold text-blue-950">{row.employeeName || "-"}</td>
                          <td className="p-3">{row.totals.p}</td>
                          <td className="p-3">{row.totals.a}</td>
                          <td className="p-3">{row.totals.w}</td>
                          <td className="p-3">{row.totals.h}</td>
                          <td className="p-3">{row.totals.payDays}</td>
                          <td className="p-3">{row.totals.totalWorkHours.toFixed(2)}</td>
                          <td className="p-3">{row.totals.totalOtHours.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
