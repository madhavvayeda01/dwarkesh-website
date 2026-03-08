import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import * as XLSX from "xlsx";
import { Prisma, WeekendType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { listSupabaseFilesByPrefix } from "@/lib/storage";
import { normalizeEmployeeCode } from "@/lib/employee-code";
import {
  generateInOutForClient,
  previewInOutGenerator,
} from "@/lib/shift-master-service";

const requestSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

type AttendanceRow = {
  employeeId: string;
  date: Date;
  status?: string | null;
  inTime: string | null;
  outTime: string | null;
  workHours?: number;
  otHours?: number;
};

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
type ShiftKey = "G" | "A" | "B" | "C";

type ShiftSlot = {
  start: number;
  end: number;
};

type ShiftConfigMap = {
  weekendType: WeekendType;
  enabledShifts: ShiftKey[];
  shifts: Record<ShiftKey, ShiftSlot>;
};

function toIsoDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function loadClientHolidaySet(clientId: string, year: number): Promise<Set<string>> {
  const rows = await prisma.clientHoliday.findMany({
    where: { clientId, year },
    select: { date: true },
  });
  return new Set(rows.map((row) => toIsoDateOnly(row.date)));
}

function getMonthRange(month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start, end, daysInMonth: end.getDate() };
}

function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hh = String(Math.floor(normalized / 60)).padStart(2, "0");
  const mm = String(normalized % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function timeToMinutes(timeValue: Date): number {
  return timeValue.getUTCHours() * 60 + timeValue.getUTCMinutes();
}

function durationMinutes(start: number, end: number): number {
  let diff = end - start;
  if (diff < 0) diff += 1440;
  return diff;
}

function dayMatchesWeekend(date: Date, weekendType: WeekendType): boolean {
  const day = date.getDay();
  if (weekendType === "MON") return day === 1;
  if (weekendType === "TUE") return day === 2;
  if (weekendType === "WED") return day === 3;
  if (weekendType === "THU") return day === 4;
  if (weekendType === "FRI") return day === 5;
  if (weekendType === "SAT") return day === 6;
  return day === 0;
}

function weekBucket(date: Date): string {
  const week = Math.floor((date.getDate() - 1) / 7);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${week}`;
}

function isRotationalOff(employeeId: string, date: Date): boolean {
  const rng = createSeededRandom(hashSeed(`off-${employeeId}-${weekBucket(date)}`));
  const offDay = randomInt(rng, 0, 6);
  return date.getDay() === offDay;
}

function isWeeklyOff(employeeId: string, date: Date, weekendType: WeekendType): boolean {
  if (weekendType === "ROTATIONAL") {
    return isRotationalOff(employeeId, date);
  }
  return dayMatchesWeekend(date, weekendType);
}

function selectEmployeeShift(employeeId: string, enabledShifts: ShiftKey[]): ShiftKey {
  if (enabledShifts.length === 0) return "G";
  const rng = createSeededRandom(hashSeed(`shift-${employeeId}`));
  const index = Math.floor(rng() * enabledShifts.length);
  return enabledShifts[index] || enabledShifts[0];
}

function generateAttendance(
  employeeId: string,
  date: Date,
  holidays: Set<string>,
  weekendType: WeekendType,
  shiftSlot: ShiftSlot
): {
  date: Date;
  shiftCode: ShiftKey;
  inTime: string | null;
  outTime: string | null;
  breakMinutes: number;
  workHours: number;
  otHours: number;
} {
  const iso = toIsoDateOnly(date);
  const shiftCode = "G";
  if (isWeeklyOff(employeeId, date, weekendType) || holidays.has(iso)) {
    return {
      date,
      shiftCode,
      inTime: null,
      outTime: null,
      breakMinutes: 0,
      workHours: 0,
      otHours: 0,
    };
  }

  const rng = createSeededRandom(hashSeed(`${employeeId}-${iso}`));
  const inMinutes = shiftSlot.start + randomInt(rng, -20, 15);
  const outMinutes = shiftSlot.end + randomInt(rng, -10, 120);
  const breakMinutes = randomInt(rng, 45, 75);
  const shiftDuration = durationMinutes(shiftSlot.start, shiftSlot.end);
  const actualDuration = Math.max(0, durationMinutes(inMinutes, outMinutes) - breakMinutes);
  const workHours = round2(actualDuration / 60);
  const overtimeMinutes = Math.max(0, durationMinutes(shiftSlot.start, outMinutes) - shiftDuration);
  const otHours = round2(overtimeMinutes / 60);

  return {
    date,
    shiftCode,
    inTime: formatTime(inMinutes),
    outTime: formatTime(outMinutes),
    breakMinutes,
    workHours,
    otHours,
  };
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

async function readFileBytes(fileUrl: string): Promise<Buffer | null> {
  try {
    if (/^https?:\/\//i.test(fileUrl)) {
      const res = await fetch(fileUrl);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    }

    if (fileUrl.startsWith("/uploads/")) {
      const fullPath = path.join(process.cwd(), "public", fileUrl);
      return await fs.readFile(fullPath);
    }
    return null;
  } catch {
    return null;
  }
}

async function loadPayrollPayDaysMap(
  clientId: string,
  month: number,
  year: number
): Promise<Map<string, number>> {
  const prefix = `payroll-generated/${clientId}/`;
  const listed = await listSupabaseFilesByPrefix(prefix);
  if (!listed.ok) return new Map();

  const monthLabel = MONTHS[month - 1].replace(/[^a-zA-Z0-9_-]/g, "_");
  const matchPrefix = `payroll_${monthLabel}_${year}_`;
  const candidates = listed.files
    .filter((file) => file.name.startsWith(matchPrefix))
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

  if (candidates.length === 0) return new Map();

  const bytes = await readFileBytes(candidates[0].fileUrl);
  if (!bytes) return new Map();

  const wb = XLSX.read(bytes, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const map = new Map<string, number>();

  // Payroll export structure:
  // Row 3 headers, row 4+ data.
  for (let row = 4; row <= 5000; row += 1) {
    const emp = ws[`B${row}`]?.v;
    const payDays = ws[`I${row}`]?.v;
    const empCode = normalizeEmployeeCode(emp === undefined || emp === null ? "" : String(emp));
    if (!empCode) break;
    map.set(empCode, toNumber(payDays));
  }

  return map;
}

function buildPresentSet(
  employeeId: string,
  month: number,
  year: number,
  daysInMonth: number,
  holidays: Set<string>,
  weekendType: WeekendType,
  targetPresentDays: number
): Set<number> {
  const workCandidates: number[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month - 1, day);
    if (isWeeklyOff(employeeId, date, weekendType)) continue;
    if (holidays.has(toIsoDateOnly(date))) continue;
    workCandidates.push(day);
  }

  const capped = Math.max(0, Math.min(workCandidates.length, Math.floor(targetPresentDays)));
  if (capped === 0) return new Set<number>();
  if (capped >= workCandidates.length) return new Set(workCandidates);

  const rng = createSeededRandom(hashSeed(`present-${employeeId}-${month}-${year}`));
  const scored = workCandidates.map((day) => ({ day, score: rng() }));
  scored.sort((a, b) => a.score - b.score);
  return new Set(scored.slice(0, capped).map((item) => item.day));
}

function statusFromRecordWithShift(
  employeeId: string,
  date: Date,
  storedStatus: string | null | undefined,
  inTime: string | null,
  outTime: string | null,
  holidays: Set<string>,
  weekendType: WeekendType
) {
  if (storedStatus && ["P", "A", "H", "PL", "WO"].includes(storedStatus)) return storedStatus;
  if (isWeeklyOff(employeeId, date, weekendType)) return "W";
  if (inTime && outTime) return "P";
  if (holidays.has(toIsoDateOnly(date))) return "H";
  return "A";
}

export async function POST(req: Request) {
  const { error, session } = await requireClientModule("in_out");
  if (error || !session) return error;
  if (!session.clientId) return fail("Unauthorized", 401);

  const parsed = requestSchema.safeParse(await req.json());
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());

  const { month, year } = parsed.data;
  const result = await generateInOutForClient(session.clientId, month, year);
  if ("error" in result) {
    return fail(
      String(result.error || "Generation failed"),
      400,
      "missingEmployeePayroll" in result
        ? { missingEmployeePayroll: result.missingEmployeePayroll || [] }
        : null
    );
  }

  return ok(
    result.partialSuccess
      ? "Attendance generated with partial success. Some employees failed."
      : "Attendance generated successfully.",
    result
  );
}

export async function GET(req: Request) {
  const probeUrl = new URL(req.url);
  if (probeUrl.searchParams.get("__route_probe") === "1") {
    return NextResponse.json({ handler: "app/api/client/in-out/route.ts" });
  }

  const { error, session } = await requireClientModule("in_out");
  if (error || !session) return error;
  if (!session.clientId) return fail("Unauthorized", 401);

  const parsed = requestSchema.safeParse({
    month: Number(probeUrl.searchParams.get("month")),
    year: Number(probeUrl.searchParams.get("year")),
  });
  if (!parsed.success) return fail("Invalid query", 400, parsed.error.flatten());

  const { month, year } = parsed.data;
  const { daysInMonth } = getMonthRange(month, year);
  const holidays = await loadClientHolidaySet(session.clientId, year);
  const shiftConfigRaw = await prisma.clientShiftConfig.findUnique({
    where: { clientId: session.clientId },
    select: {
      weekendType: true,
      generalShiftEnabled: true,
      shiftAEnabled: true,
      shiftBEnabled: true,
      shiftCEnabled: true,
    },
  });
  const weekendType = shiftConfigRaw?.weekendType || "SUN";
  const enabledShifts: ShiftKey[] = ([] as ShiftKey[])
    .concat(shiftConfigRaw?.generalShiftEnabled ? ["G"] : [])
    .concat(shiftConfigRaw?.shiftAEnabled ? ["A"] : [])
    .concat(shiftConfigRaw?.shiftBEnabled ? ["B"] : [])
    .concat(shiftConfigRaw?.shiftCEnabled ? ["C"] : []);
  const safeEnabledShifts: ShiftKey[] =
    enabledShifts.length > 0 ? enabledShifts : (["G"] as ShiftKey[]);

  const preview = await previewInOutGenerator(session.clientId, month, year);
  const shiftByEmployeeId = new Map<string, string>();
  if (!("error" in preview)) {
    const assignedRows = preview.employees as Array<{
      employeeId: string;
      assignedShift?: string;
      shift?: string;
    }>;
    for (const employee of assignedRows) {
      shiftByEmployeeId.set(employee.employeeId, employee.assignedShift || employee.shift || "G");
    }
  }

  const employees = await prisma.employee.findMany({
    where: { clientId: session.clientId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      empNo: true,
      fullName: true,
    },
  });

  if (employees.length === 0) {
    return fail("No employees available for the selected month and year.", 400);
  }

  const records = await prisma.$queryRaw<AttendanceRow[]>`
    SELECT "employeeId", "date", "status", "inTime", "outTime", "workHours", "otHours"
    FROM "Attendance"
    WHERE "employeeId" IN (${Prisma.join(employees.map((employee) => employee.id))})
      AND "month" = ${month}
      AND "year" = ${year}
    ORDER BY "date" ASC
  `;

  const recordMap = new Map<string, AttendanceRow>();
  records.forEach((record) => {
    const day = new Date(record.date).getDate();
    recordMap.set(`${record.employeeId}|${day}`, record);
  });

  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const rows = employees.map((employee, index) => {
    let p = 0;
    let a = 0;
    let w = 0;
    let h = 0;
    let totalWorkHours = 0;
    let totalOtHours = 0;

    const dayEntries = days.map((day) => {
      const date = new Date(year, month - 1, day);
      const record = recordMap.get(`${employee.id}|${day}`);
      const inTime = record?.inTime || null;
      const outTime = record?.outTime || null;
      const status = statusFromRecordWithShift(
        employee.id,
        date,
        record?.status,
        inTime,
        outTime,
        holidays,
        weekendType
      );

      if (status === "P") p += 1;
      else if (status === "A") a += 1;
      else if (status === "W" || status === "WO") w += 1;
      else if (status === "H" || status === "PL") h += 1;

      totalWorkHours += Number(record?.workHours || 0);
      totalOtHours += Number(record?.otHours || 0);

      return {
        day,
        status,
        shift: shiftByEmployeeId.get(employee.id) || selectEmployeeShift(employee.id, safeEnabledShifts),
        inTime,
        outTime,
      };
    });

    return {
      srNo: index + 1,
      empCode: employee.empNo || "",
      employeeName: employee.fullName || "",
      totals: {
        p,
        a,
        w,
        h,
        payDays: p + h,
        totalWorkHours: Math.round(totalWorkHours * 100) / 100,
        totalOtHours: Math.round(totalOtHours * 100) / 100,
      },
      days: dayEntries,
    };
  });

  return ok("In-out attendance fetched", {
    month,
    year,
    days,
    rows,
  });
}
