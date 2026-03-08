"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ClientSidebar from "@/components/ClientSidebar";
import { normalizeEmployeeCode } from "@/lib/employee-code";
import { useClientPageAccess } from "@/lib/use-client-page-access";

type Employee = {
  id: string;
  empNo: string | null;
  fullName: string | null;
};

type ShiftPreviewRow = {
  employeeId: string;
  empCode: string;
  employeeName: string;
  payDays: number;
  otHoursTarget: number;
  gender: string | null;
  shiftCategory: "STAFF" | "WORKER";
  assignedShift: "G" | "A" | "B" | "C";
  weeklyOff: string;
};

type ShiftPreviewConfig = {
  weekendType: string;
  shiftConfig?: {
    shifts: {
      G: { start: number; end: number };
      A: { start: number; end: number };
      B: { start: number; end: number };
      C: { start: number; end: number };
    };
  };
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

function formatShiftWindow(start: number, end: number) {
  return `${formatHHMM(start)} - ${formatHHMM(end)}`;
}

export default function ClientInOutPage() {
  const [moduleEnabled, setModuleEnabled] = useState<boolean | null>(null);
  const { moduleEnabled: accessEnabled, loading: accessLoading } = useClientPageAccess({
    pageKey: "in_out",
  });
  const [activeTab, setActiveTab] = useState<"attendance" | "shift_master">("attendance");
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payDaysByCode, setPayDaysByCode] = useState<Record<string, number>>({});
  const [otHoursByCode, setOtHoursByCode] = useState<Record<string, number>>({});
  const [shiftPreviewRows, setShiftPreviewRows] = useState<ShiftPreviewRow[]>([]);
  const [shiftPreviewConfig, setShiftPreviewConfig] = useState<ShiftPreviewConfig | null>(null);
  const [shiftPreviewWarnings, setShiftPreviewWarnings] = useState<string[]>([]);
  const [loadingShiftPreview, setLoadingShiftPreview] = useState(false);
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
      const payrollOtHours = empCode ? Number(otHoursByCode[empCode] ?? 0) : 0;
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
      const baseWorkHrs = attendance.map((m, i) => {
        if (m !== "P") return null;
        return Math.max(0, (inHrs[i] ?? 0) - (breakHrs[i] ?? 0));
      });
      const otHrs: Array<number | null> = attendance.map((m) => (m === "P" ? 0 : null));
      const presentDayIndexes = attendance
        .map((mark, dayIndex) => ({ mark, dayIndex }))
        .filter((item) => item.mark === "P")
        .map((item) => item.dayIndex);
      const maxOtMinutes = presentDayIndexes.length * 120;
      let remainingOtMinutes = Math.max(
        0,
        Math.min(maxOtMinutes, Math.round(Math.max(0, payrollOtHours) * 60))
      );
      for (const dayIndex of presentDayIndexes) {
        if (remainingOtMinutes <= 0) break;
        const assigned = Math.min(120, remainingOtMinutes);
        otHrs[dayIndex] = assigned;
        remainingOtMinutes -= assigned;
      }
      const workHrs = attendance.map((m, i) => {
        if (m !== "P") return null;
        return (baseWorkHrs[i] ?? 0) + (otHrs[i] ?? 0);
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
  }, [employees, month, year, dayHeaders, payDaysByCode, otHoursByCode]);

  useEffect(() => {
    async function init() {
      if (accessEnabled === false) {
        setModuleEnabled(false);
        setLoading(false);
        return;
      }
      if (accessEnabled !== true) return;
      setModuleEnabled(true);

      const res = await fetch("/api/client/employees", { cache: "no-store" });
      const data = await res.json();
      const payload = data?.data ?? data;
      const rows: Employee[] = payload?.employees || [];
      setEmployees(rows);
      setLoading(false);
    }

    if (accessLoading) return;
    void init();
  }, [accessEnabled, accessLoading]);

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
          setOtHoursByCode({});
          return;
        }
        setPayDaysByCode((payload?.payDaysByCode || {}) as Record<string, number>);
        setOtHoursByCode((payload?.otHoursByCode || {}) as Record<string, number>);
      } catch {
        setPayDaysByCode({});
        setOtHoursByCode({});
      }
    }

    loadPayrollPayDays();
  }, [moduleEnabled, month, year]);

  useEffect(() => {
    if (moduleEnabled !== true) return;

    async function loadShiftPreview() {
      setLoadingShiftPreview(true);
      try {
        const res = await fetch(`/api/client/in-out/shift-preview?month=${month + 1}&year=${year}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        const payload = data?.data ?? data;
        if (!res.ok) {
          setShiftPreviewRows([]);
          setShiftPreviewConfig(null);
          const message = data?.message || "Failed to load shift preview.";
          setShiftPreviewWarnings(message ? [message] : []);
          return;
        }

        setShiftPreviewRows((payload?.employees || []) as ShiftPreviewRow[]);
        setShiftPreviewConfig({
          weekendType: String(payload?.weekendType || ""),
          shiftConfig: payload?.shiftConfig,
        });
        setShiftPreviewWarnings(Array.isArray(payload?.warnings) ? payload.warnings : []);
      } catch {
        setShiftPreviewRows([]);
        setShiftPreviewConfig(null);
        setShiftPreviewWarnings(["Failed to load shift preview."]);
      } finally {
        setLoadingShiftPreview(false);
      }
    }

    loadShiftPreview();
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
            <h2 className="text-xl font-bold text-blue-950">Page Disabled</h2>
            <p className="mt-2 text-slate-600">This page is not enabled by consultant.</p>
          </div>
        ) : (
          <>
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-extrabold text-blue-950">IN-OUT</h1>
                  <p className="mt-1 text-sm text-slate-600">Monthly attendance processing dashboard.</p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm"
                  aria-label="Machine Connected Online"
                >
                  <span className="relative inline-flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
                  </span>
                  <span className="animate-pulse">Machine Connected Online</span>
                </button>
              </div>
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

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("attendance")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  activeTab === "attendance"
                    ? "bg-blue-900 text-white"
                    : "bg-white text-slate-700 ring-1 ring-slate-300"
                }`}
              >
                Attendance
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("shift_master")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  activeTab === "shift_master"
                    ? "bg-blue-900 text-white"
                    : "bg-white text-slate-700 ring-1 ring-slate-300"
                }`}
              >
                Shift Master
              </button>
            </div>

            {status && <p className="mt-3 text-sm font-semibold text-slate-700">{status}</p>}

            {activeTab === "attendance" ? (
              <>
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
                <p className="text-slate-600">Fetching device data...</p>
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
            ) : (
              <div className="mt-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <h2 className="text-lg font-bold text-blue-950">Shift Master Preview</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Read-only shift assignment preview for selected month and year.
                </p>

                {shiftPreviewConfig?.shiftConfig ? (
                  <div className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 text-xs font-semibold text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
                    <p>G: {formatShiftWindow(shiftPreviewConfig.shiftConfig.shifts.G.start, shiftPreviewConfig.shiftConfig.shifts.G.end)}</p>
                    <p>A: {formatShiftWindow(shiftPreviewConfig.shiftConfig.shifts.A.start, shiftPreviewConfig.shiftConfig.shifts.A.end)}</p>
                    <p>B: {formatShiftWindow(shiftPreviewConfig.shiftConfig.shifts.B.start, shiftPreviewConfig.shiftConfig.shifts.B.end)}</p>
                    <p>C: {formatShiftWindow(shiftPreviewConfig.shiftConfig.shifts.C.start, shiftPreviewConfig.shiftConfig.shifts.C.end)}</p>
                    <p className="sm:col-span-2 lg:col-span-4">
                      Week Off Mode: {shiftPreviewConfig.weekendType || "-"}
                    </p>
                  </div>
                ) : null}

                {shiftPreviewWarnings.length > 0 ? (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                    {shiftPreviewWarnings.map((warning) => (
                      <p key={warning}>{warning}</p>
                    ))}
                  </div>
                ) : null}

                {loadingShiftPreview ? (
                  <p className="mt-3 text-sm text-slate-600">Loading shift preview...</p>
                ) : shiftPreviewRows.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">No payroll mapped employees found.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[860px] text-sm">
                      <thead className="bg-slate-100 text-left">
                        <tr>
                          <th className="border px-3 py-2">Emp Code</th>
                          <th className="border px-3 py-2">Employee</th>
                          <th className="border px-3 py-2">Gender</th>
                          <th className="border px-3 py-2">Category</th>
                          <th className="border px-3 py-2">Shift</th>
                          <th className="border px-3 py-2">Weekly Off</th>
                          <th className="border px-3 py-2">Pay Days</th>
                          <th className="border px-3 py-2">OT Target</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shiftPreviewRows.map((row) => (
                          <tr key={row.employeeId}>
                            <td className="border px-3 py-2">{row.empCode || "-"}</td>
                            <td className="border px-3 py-2">{row.employeeName || "-"}</td>
                            <td className="border px-3 py-2">{row.gender || "-"}</td>
                            <td className="border px-3 py-2">{row.shiftCategory}</td>
                            <td className="border px-3 py-2 font-bold text-blue-900">{row.assignedShift}</td>
                            <td className="border px-3 py-2">{row.weeklyOff}</td>
                            <td className="border px-3 py-2">{row.payDays}</td>
                            <td className="border px-3 py-2">{row.otHoursTarget}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}



