"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ClientSidebar from "@/components/ClientSidebar";
import { normalizeEmployeeCode } from "@/lib/employee-code";

type Employee = {
  id: string;
  empNo: string | null;
  fullName: string | null;
};

type ShiftCode = "G" | "A" | "B" | "C";
type AttendanceMark = "P" | "A" | "W" | "H";
const SHIFT_CODES: ShiftCode[] = ["G", "A", "B", "C"];
const WEEK_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
const BLOCK_ROWS = ["ATTENDANCE", "IN.TIME", "OUT.TIME", "In Hrs", "Shift Hrs", "Break Hrs", "Work Hrs", "OT Hrs"] as const;

function makeSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rngFactory(seed: number): () => number {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function formatHHMM(totalMinutes: number): string {
  const safe = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDuration(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function ClientInOutPage() {
  const [moduleEnabled, setModuleEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payDaysByCode, setPayDaysByCode] = useState<Record<string, number>>({});
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

  const monthDays = useMemo(() => {
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => i + 1);
  }, [month, year]);
  const dayHeaders = useMemo(() => {
    return monthDays.map((day) => {
      const date = new Date(year, month, day);
      const dayName = date
        .toLocaleDateString("en-US", { weekday: "short" })
        .toUpperCase();
      return {
        day,
        dayName,
      };
    });
  }, [monthDays, month, year]);

  const computed = useMemo(() => {
    return employees.map((employee, index) => {
      const rand = rngFactory(makeSeed(`${employee.id}-${month}-${year}`));
      const shift = SHIFT_CODES[Math.floor(rand() * SHIFT_CODES.length)];
      const weeklyOff = WEEK_DAYS[Math.floor(rand() * WEEK_DAYS.length)];
      const helper = dayHeaders.map((d) => (d.dayName === weeklyOff ? -1 : rand()));
      const workingDays = dayHeaders.filter((d) => d.dayName !== weeklyOff).length;
      const maxPayDays = Math.max(0, Math.min(workingDays, dayHeaders.length));
      const empCode = normalizeEmployeeCode(employee.empNo || "");
      const payrollPayDays = empCode ? Number(payDaysByCode[empCode] ?? 0) : 0;
      const payDays = Math.max(0, Math.min(maxPayDays, payrollPayDays));

      const ranked = helper
        .map((value, dayIndex) => ({ value, dayIndex }))
        .filter((x) => x.value >= 0)
        .sort((a, b) => b.value - a.value);
      const pCount = Math.floor(payDays);
      const includeHalf = Math.abs(payDays - pCount - 0.5) < 0.001;
      const presentSet = new Set(ranked.slice(0, pCount).map((x) => x.dayIndex));
      const halfDayIndex = includeHalf && ranked[pCount] ? ranked[pCount].dayIndex : -1;

      const attendance: AttendanceMark[] = dayHeaders.map((d, i) => {
        if (d.dayName === weeklyOff) return "W";
        if (presentSet.has(i)) return "P";
        if (halfDayIndex === i) return "H";
        return "A";
      });

      const inMinutes = attendance.map((m) => {
        if (m !== "P") return null;
        if (shift === "G") return Math.round((9.27 + rand() * (9.62 - 9.27)) * 60);
        if (shift === "A") return Math.round((8.11 + rand() * (8.15 - 8.11)) * 60);
        if (shift === "B") return Math.round((16.11 + rand() * (16.15 - 16.11)) * 60);
        return Math.round((24.13 + rand() * (24.85 - 24.13)) * 60);
      });
      const outMinutes = attendance.map((m) => {
        if (m !== "P") return null;
        if (shift === "G") return Math.round((18.13 + rand() * (18.85 - 18.13)) * 60);
        if (shift === "A") return Math.round((16.13 + rand() * (16.85 - 16.13)) * 60);
        if (shift === "B") return Math.round((24.13 + rand() * (24.85 - 24.13)) * 60);
        return Math.round((8.13 + rand() * (8.85 - 8.13)) * 60);
      });
      const inHrs = attendance.map((m, i) => {
        if (m !== "P") return null;
        const inMin = inMinutes[i] ?? 0;
        const outMin = outMinutes[i] ?? 0;
        return ((outMin - inMin) % 1440 + 1440) % 1440;
      });
      const shiftHrs = attendance.map((m) => (m === "P" ? 480 : null));
      const breakHrs = attendance.map((m) => (m === "P" ? 60 : null));
      const workHrs = attendance.map((m, i) => {
        if (m !== "P") return null;
        return Math.max(0, (inHrs[i] ?? 0) - (breakHrs[i] ?? 0));
      });
      const otHrs = attendance.map((m, i) => {
        if (m !== "P") return null;
        return Math.max(0, (workHrs[i] ?? 0) - (shiftHrs[i] ?? 0));
      });

      const counts = attendance.reduce(
        (acc, item) => {
          acc[item] += 1;
          return acc;
        },
        { P: 0, A: 0, W: 0, H: 0 } as Record<AttendanceMark, number>
      );

      return {
        employee,
        srNo: index + 1,
        shift,
        weeklyOff,
        payDays,
        helper,
        attendance,
        inMinutes,
        outMinutes,
        inHrs,
        shiftHrs,
        breakHrs,
        workHrs,
        otHrs,
        totals: {
          P: counts.P,
          A: counts.A,
          W: counts.W,
          H: counts.H,
          PL: 0,
          payDays,
        },
      };
    });
  }, [employees, month, year, dayHeaders, payDaysByCode]);

  useEffect(() => {
    async function init() {
      const me = await fetch("/api/client/me");
      const meData = await me.json();
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

      const res = await fetch("/api/client/employees", { cache: "no-store" });
      const data = await res.json();
      const payload = data?.data ?? data;
      const rows: Employee[] = payload?.employees || [];
      setEmployees(rows);
      setLoading(false);
    }

    init();
  }, []);

  useEffect(() => {
    if (moduleEnabled !== true) return;

    async function loadPayrollPayDays() {
      try {
        const res = await fetch(`/api/client/in-out/paydays?month=${month + 1}&year=${year}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        const payload = data?.data ?? data;
        if (!res.ok) {
          setPayDaysByCode({});
          return;
        }
        setPayDaysByCode((payload?.payDaysByCode || {}) as Record<string, number>);
      } catch {
        setPayDaysByCode({});
      }
    }

    loadPayrollPayDays();
  }, [moduleEnabled, month, year]);

  async function generateInOut() {
    setGenerating(true);
    setStatus("Generating IN-OUT...");
    try {
      const res = await fetch("/api/client/in-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: month + 1, year }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data?.message || "Failed to generate IN-OUT.");
        return;
      }
      const payload = data?.data ?? data;
      setStatus(payload?.message || data?.message || "IN-OUT generated successfully.");
    } catch {
      setStatus("Failed to generate IN-OUT.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-slate-100">
      <ClientSidebar />
      <main className="flex-1 overflow-x-hidden p-4 text-slate-900 lg:p-5">
        {moduleEnabled === false ? (
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-blue-950">Module Disabled</h2>
            <p className="mt-2 text-slate-600">Module not enabled by consultant.</p>
          </div>
        ) : (
          <>
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <h1 className="text-2xl font-extrabold text-blue-950">IN-OUT</h1>
              <p className="mt-1 text-sm text-slate-600">Monthly attendance processing dashboard.</p>
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
              <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
                Month
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
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
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                >
                  {yearOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              <button
                onClick={generateInOut}
                disabled={generating || moduleEnabled !== true}
                className="rounded-lg bg-blue-900 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generating ? "Generating..." : "Generate IN-OUT"}
              </button>

              <Link
                href="/client/in-out-data"
                className="rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-amber-300"
              >
                IN-OUT Data
              </Link>
            </div>

            {status && <p className="mt-3 text-sm font-semibold text-slate-700">{status}</p>}

            <div className="mt-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">P - Present</span>
                <span className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700">A - Absent</span>
                <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-indigo-700">W - Weekly Off</span>
                <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">H - Holiday</span>
              </div>
            </div>

            <div className="mt-3 w-full max-w-full rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200">
              {loading ? (
                <p className="text-slate-600">Loading employees...</p>
              ) : employees.length === 0 ? (
                <p className="text-slate-600">No employees found.</p>
              ) : (
                <div className="w-full max-w-full overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-[1820px] w-full border-collapse text-[11px] text-slate-900">
                    <thead>
                      <tr className="bg-slate-100">
                        <th rowSpan={3} className="sticky left-0 z-30 w-[48px] min-w-[48px] border-b border-r border-slate-300 bg-slate-100 px-1 py-1 text-center font-bold">
                          S.
                          <br />
                          No.
                        </th>
                        <th rowSpan={3} className="sticky left-[47px] z-30 w-[64px] min-w-[64px] border-b border-r border-slate-300 bg-slate-100 px-1 py-1 text-center font-bold">
                          Emp
                          <br />
                          Code
                        </th>
                        <th rowSpan={3} className="sticky left-[110px] z-30 w-[140px] min-w-[140px] border-b border-r border-slate-300 bg-slate-100 px-1 py-1 text-center font-bold">
                          Name of Employee
                        </th>
                        <th rowSpan={3} className="border-b border-r border-slate-300 px-1.5 py-1 text-center font-bold">
                          TIME
                        </th>
                        <th
                          colSpan={monthDays.length}
                          className="border-b border-r border-slate-300 bg-blue-50 px-1.5 py-1 text-center font-bold text-blue-900"
                        >
                          {MONTHS[month]}-{year}
                        </th>
                        <th
                          colSpan={6}
                          className="border-b border-slate-300 bg-blue-50 px-1.5 py-1 text-center font-bold text-blue-900"
                        >
                          TOTAL REPORT
                        </th>
                      </tr>
                      <tr className="bg-slate-50">
                        {monthDays.map((day) => (
                          <th key={`day-num-${day}`} className="border-b border-r border-slate-200 px-1 py-0.5 text-center font-bold">
                            {String(day).padStart(2, "0")}
                          </th>
                        ))}
                        <th className="border-b border-r border-slate-200 px-1 py-0.5 text-center font-bold">P</th>
                        <th className="border-b border-r border-slate-200 px-1 py-0.5 text-center font-bold">A</th>
                        <th className="border-b border-r border-slate-200 px-1 py-0.5 text-center font-bold">W</th>
                        <th className="border-b border-r border-slate-200 px-1 py-0.5 text-center font-bold">H</th>
                        <th className="border-b border-r border-slate-200 px-1 py-0.5 text-center font-bold">PL</th>
                        <th className="border-b border-slate-200 px-1 py-0.5 text-center font-bold">PAY DAYS</th>
                      </tr>
                      <tr className="bg-slate-50">
                        {dayHeaders.map((d) => (
                          <th key={`day-name-${d.day}`} className="border-b border-r border-slate-200 px-1 py-0.5 text-center font-semibold text-slate-500">
                            {d.dayName}
                          </th>
                        ))}
                        <th className="border-b border-r border-slate-200 px-1 py-0.5 text-center"></th>
                        <th className="border-b border-r border-slate-200 px-1 py-0.5 text-center"></th>
                        <th className="border-b border-r border-slate-200 px-1 py-0.5 text-center"></th>
                        <th className="border-b border-r border-slate-200 px-1 py-0.5 text-center"></th>
                        <th className="border-b border-r border-slate-200 px-1 py-0.5 text-center"></th>
                        <th className="border-b border-slate-200 px-1 py-0.5 text-center"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {computed.map((row) =>
                        BLOCK_ROWS.map((label, rowIndex) => (
                          <tr key={`${row.employee.id}-${label}`}>
                            {rowIndex === 0 && (
                              <>
                                <td
                                  rowSpan={BLOCK_ROWS.length}
                                  className="sticky left-0 z-20 w-[48px] min-w-[48px] border-b border-r border-slate-200 bg-white px-1 py-0.5 text-center align-middle font-bold"
                                >
                                  {row.srNo}
                                </td>
                                <td
                                  rowSpan={BLOCK_ROWS.length}
                                  className="sticky left-[47px] z-20 w-[64px] min-w-[64px] border-b border-r border-slate-200 bg-white px-1 py-0.5 text-center align-middle font-bold"
                                >
                                  {row.employee.empNo || "-"}
                                </td>
                                <td
                                  rowSpan={BLOCK_ROWS.length}
                                  className="sticky left-[110px] z-20 w-[140px] min-w-[140px] border-b border-r border-slate-200 bg-white px-1 py-0.5 text-left align-middle font-semibold text-blue-950"
                                  title={row.employee.fullName || "-"}
                                >
                                  <span className="block max-w-[132px] truncate">{row.employee.fullName || "-"}</span>
                                </td>
                              </>
                            )}
                            <td className="border-b border-r border-slate-200 px-1.5 py-0.5 text-center font-semibold">
                              {label === "ATTENDANCE"
                                ? row.weeklyOff
                                : label}
                            </td>
                            {dayHeaders.map((d, dayIdx) => (
                              <td
                                key={`${row.employee.id}-${label}-day-${d.day}`}
                                className="border-b border-r border-slate-200 px-1 py-0.5 text-center font-medium"
                              >
                                {label === "ATTENDANCE"
                                  ? row.attendance[dayIdx]
                                  : label === "IN.TIME"
                                  ? row.inMinutes[dayIdx] == null
                                    ? ""
                                    : formatHHMM(row.inMinutes[dayIdx]!)
                                  : label === "OUT.TIME"
                                  ? row.outMinutes[dayIdx] == null
                                    ? ""
                                    : formatHHMM(row.outMinutes[dayIdx]!)
                                  : label === "In Hrs"
                                  ? row.inHrs[dayIdx] == null
                                    ? ""
                                    : formatDuration(row.inHrs[dayIdx]!)
                                  : label === "Shift Hrs"
                                  ? row.shiftHrs[dayIdx] == null
                                    ? ""
                                    : formatDuration(row.shiftHrs[dayIdx]!)
                                  : label === "Break Hrs"
                                  ? row.breakHrs[dayIdx] == null
                                    ? ""
                                    : formatDuration(row.breakHrs[dayIdx]!)
                                  : label === "Work Hrs"
                                  ? row.workHrs[dayIdx] == null
                                    ? ""
                                    : formatDuration(row.workHrs[dayIdx]!)
                                  : row.otHrs[dayIdx] == null
                                  ? ""
                                  : formatDuration(row.otHrs[dayIdx]!)}
                              </td>
                            ))}
                            <td className="border-b border-r border-slate-200 px-1 py-0.5 text-center font-semibold">
                              {label === "ATTENDANCE"
                                ? row.totals.P
                                : label === "OUT.TIME"
                                ? "Max Hrs"
                                : label === "In Hrs"
                                ? row.totals.P * 8
                                : label === "Break Hrs"
                                ? "Work Hrs"
                                : label === "Work Hrs"
                                ? formatDuration(
                                    row.workHrs.reduce<number>((a, b) => a + (b ?? 0), 0)
                                  )
                                : label === "OT Hrs"
                                ? formatDuration(row.otHrs.reduce<number>((a, b) => a + (b ?? 0), 0))
                                : ""}
                            </td>
                            <td className="border-b border-r border-slate-200 px-1 py-0.5 text-center font-semibold">
                              {label === "ATTENDANCE" ? row.totals.A : ""}
                            </td>
                            <td className="border-b border-r border-slate-200 px-1 py-0.5 text-center font-semibold">
                              {label === "ATTENDANCE" ? row.totals.W : ""}
                            </td>
                            <td className="border-b border-r border-slate-200 px-1 py-0.5 text-center font-semibold">
                              {label === "ATTENDANCE" ? row.totals.H : ""}
                            </td>
                            <td className="border-b border-r border-slate-200 px-1 py-0.5 text-center font-semibold">
                              {label === "ATTENDANCE" ? row.totals.PL : ""}
                            </td>
                            <td className="border-b border-slate-200 px-1 py-0.5 text-center font-semibold">
                              {label === "ATTENDANCE" ? row.totals.payDays : ""}
                            </td>
                          </tr>
                        ))
                      )}
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
