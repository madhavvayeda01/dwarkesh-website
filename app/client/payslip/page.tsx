"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ClientSidebar from "@/components/ClientSidebar";

export default function ClientPayslipPage() {
  const [moduleEnabled, setModuleEnabled] = useState<boolean | null>(null);
  const [status, setStatus] = useState("");
  const [generating, setGenerating] = useState(false);
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

  useEffect(() => {
    async function init() {
      const me = await fetch("/api/client/me");
      const meData = await me.json().catch(() => ({}));
      const loggedIn = meData?.data?.loggedIn ?? meData?.loggedIn ?? false;
      if (!loggedIn) {
        window.location.href = "/signin";
        return;
      }

      const accessRes = await fetch("/api/client/modules?page=payslip", { cache: "no-store" });
      const accessData = await accessRes.json().catch(() => ({}));
      setModuleEnabled(!!(accessRes.ok && accessData?.data?.enabled));
    }
    init();
  }, []);

  async function generatePayslip() {
    setGenerating(true);
    setStatus("Generating payslip PDF...");
    try {
      const res = await fetch("/api/client/payslip/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      const data = await res.json().catch(() => ({}));
      const payload = data?.data ?? data;
      if (!res.ok) {
        setStatus(data?.message || "Failed to generate payslip.");
        return;
      }

      if (payload?.fileUrl && payload?.fileName) {
        const downloadRes = await fetch(payload.fileUrl);
        if (downloadRes.ok) {
          const blob = await downloadRes.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = payload.fileName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        }
      }

      setStatus(`Payslip generated for ${MONTHS[month]} ${year}.`);
    } catch {
      setStatus("Failed to generate payslip.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <ClientSidebar />
      <main className="flex-1 p-8">
        {moduleEnabled === false ? (
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-blue-950">Page Disabled</h2>
            <p className="mt-2 text-slate-600">This page is not enabled by consultant.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-blue-950">Payslip</h1>
                <p className="mt-1 text-slate-600">
                  Generate bank and compliance friendly payslip PDF using generated payroll data.
                </p>
              </div>
              <Link
                href="/client/payslip-data"
                className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-blue-950 hover:bg-yellow-400"
              >
                Payslip Data
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-end gap-4 rounded-2xl bg-white p-4 shadow">
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

              <button
                onClick={generatePayslip}
                disabled={generating}
                className="rounded-2xl bg-blue-900 px-5 py-2 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generating ? "Generating..." : "Generate Payslip"}
              </button>
            </div>

            {status && <p className="mt-4 text-sm font-semibold text-slate-700">{status}</p>}
          </>
        )}
      </main>
    </div>
  );
}



