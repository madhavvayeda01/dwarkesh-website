"use client";

import { useEffect, useState } from "react";
import ClientSidebar from "@/components/ClientSidebar";

export default function ClientEsicChallanPage() {
  const [moduleEnabled, setModuleEnabled] = useState<boolean | null>(null);
  const [status, setStatus] = useState("");
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

  const yearOptions = Array.from({ length: 11 }, (_, i) => today.getFullYear() - 5 + i);

  useEffect(() => {
    async function checkLogin() {
      const res = await fetch("/api/client/me");
      const data = await res.json();
      const loggedIn = data?.data?.loggedIn ?? data?.loggedIn ?? false;
      if (!loggedIn) window.location.href = "/signin";
      const accessRes = await fetch("/api/client/modules?page=esic_challan", { cache: "no-store" });
      const accessData = await accessRes.json().catch(() => ({}));
      setModuleEnabled(accessRes.ok ? accessData?.data?.enabled !== false : true);
    }
    checkLogin();
  }, []);

  async function generateEsicFile() {
    setStatus("Generating ESIC challan file...");
    try {
      const res = await fetch("/api/client/esic-challan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus(data?.message || "Failed to generate ESIC challan file.");
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const fileNameMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
      const fileName = fileNameMatch?.[1] || `esic_upload_${year}_${month + 1}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("ESIC challan file generated.");
    } catch {
      setStatus("Failed to generate ESIC challan file.");
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
            <h1 className="text-2xl font-bold text-blue-950">ESIC Challan</h1>
            <p className="mt-2 text-slate-600">
              Generate ESIC site compatible file from saved payroll data.
            </p>

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
                onClick={generateEsicFile}
                className="rounded-2xl bg-blue-900 px-5 py-2 font-semibold text-white hover:bg-blue-800"
              >
                Generate ESIC Challan
              </button>
            </div>

            {status && <p className="mt-4 text-sm font-semibold text-slate-700">{status}</p>}
          </>
        )}
      </main>
    </div>
  );
}



