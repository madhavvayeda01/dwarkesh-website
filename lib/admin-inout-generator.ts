import { WeekendType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { normalizeEmployeeCode } from "@/lib/employee-code";

type ShiftKey = "G" | "A" | "B" | "C";
type FinalStatus = "P" | "A" | "H" | "PL" | "WO";
type ShiftSlot = { start: number; end: number };

type ShiftConfig = {
  weekendType: WeekendType;
  enabledShifts: ShiftKey[];
  shifts: Record<ShiftKey, ShiftSlot>;
};

type PayrollEmployeeRow = {
  employeeId: string | null;
  empCode: string;
  employeeName: string;
  payDays: number;
  otHoursTarget: number;
};

type EmployeeContext = {
  employeeId: string;
  empCode: string;
  employeeName: string;
  payDays: number;
  otHoursTarget: number;
  gender: string | null;
  shift: ShiftKey;
  weeklyOffDay: number;
  baseSeed: number;
};

type SolveCandidate = {
  hCount: number;
  plExtraCount: number;
  pCount: number;
  aCount: number;
};

export type AttendanceOutputRow = {
  employeeId: string;
  date: Date;
  status: FinalStatus;
  generationSeed: string;
  inTime: string | null;
  outTime: string | null;
  breakMinutes: number;
  workHours: number;
  otHours: number;
  month: number;
  year: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
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

function shuffleDeterministic<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function toTimeMinutes(timeValue: Date): number {
  return timeValue.getUTCHours() * 60 + timeValue.getUTCMinutes();
}

function durationMinutes(start: number, end: number): number {
  let diff = end - start;
  if (diff < 0) diff += 1440;
  return diff;
}

function formatTime(totalMinutes: number): string {
  const n = ((totalMinutes % 1440) + 1440) % 1440;
  const hh = String(Math.floor(n / 60)).padStart(2, "0");
  const mm = String(n % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function isFemale(value?: string | null) {
  return (value || "").toLowerCase().trim() === "female";
}

function weekendName(day: number) {
  return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][day] || "SUN";
}

function fixedWeekendToDay(weekendType: WeekendType): number {
  if (weekendType === "MON") return 1;
  if (weekendType === "TUE") return 2;
  if (weekendType === "WED") return 3;
  if (weekendType === "THU") return 4;
  if (weekendType === "FRI") return 5;
  if (weekendType === "SAT") return 6;
  return 0;
}

function getMonthDays(month: number, year: number): Date[] {
  const count = new Date(year, month, 0).getDate();
  return Array.from({ length: count }, (_, i) => new Date(year, month - 1, i + 1));
}

async function loadPayrollRows(clientId: string, month: number, year: number): Promise<PayrollEmployeeRow[]> {
  const rows = await prisma.payrollRecord.findMany({
    where: { clientId, month, year },
    select: {
      employeeId: true,
      employeeCode: true,
      employeeName: true,
      payDays: true,
      otHoursTarget: true,
    },
  });

  return rows.map((row) => ({
    employeeId: row.employeeId,
    empCode: normalizeEmployeeCode(row.employeeCode),
    employeeName: (row.employeeName || "").trim(),
    payDays: Number(row.payDays || 0),
    otHoursTarget: Number(row.otHoursTarget || 0),
  }));
}

async function loadShiftConfig(clientId: string): Promise<ShiftConfig | null> {
  const row = await prisma.clientShiftConfig.findUnique({
    where: { clientId },
    select: {
      weekendType: true,
      generalShiftEnabled: true,
      generalShiftStart: true,
      generalShiftEnd: true,
      shiftAEnabled: true,
      shiftAStart: true,
      shiftAEnd: true,
      shiftBEnabled: true,
      shiftBStart: true,
      shiftBEnd: true,
      shiftCEnabled: true,
      shiftCStart: true,
      shiftCEnd: true,
    },
  });
  if (!row) return null;

  const enabledShifts: ShiftKey[] = ([] as ShiftKey[])
    .concat(row.generalShiftEnabled ? ["G"] : [])
    .concat(row.shiftAEnabled ? ["A"] : [])
    .concat(row.shiftBEnabled ? ["B"] : [])
    .concat(row.shiftCEnabled ? ["C"] : []);

  return {
    weekendType: row.weekendType,
    enabledShifts,
    shifts: {
      G: { start: toTimeMinutes(row.generalShiftStart), end: toTimeMinutes(row.generalShiftEnd) },
      A: { start: toTimeMinutes(row.shiftAStart), end: toTimeMinutes(row.shiftAEnd) },
      B: { start: toTimeMinutes(row.shiftBStart), end: toTimeMinutes(row.shiftBEnd) },
      C: { start: toTimeMinutes(row.shiftCStart), end: toTimeMinutes(row.shiftCEnd) },
    },
  };
}

async function loadHolidaySet(clientId: string, year: number): Promise<Set<string>> {
  const rows = await prisma.clientHoliday.findMany({
    where: { clientId, year },
    select: { date: true },
  });
  return new Set(rows.map((r) => toIso(r.date)));
}

function chooseShiftForEmployee(employeeId: string, gender: string | null, enabledShifts: ShiftKey[]): ShiftKey {
  if (isFemale(gender)) return "G";
  if (enabledShifts.length === 0) return "G";
  const rng = createSeededRandom(hashSeed(`shift-${employeeId}`));
  return enabledShifts[Math.floor(rng() * enabledShifts.length)] || enabledShifts[0];
}

function chooseWeeklyOffDay(employeeId: string, gender: string | null, shift: ShiftKey, month: number, year: number) {
  if (isFemale(gender)) return 0;
  if (shift === "G") return 0;
  const rng = createSeededRandom(hashSeed(`wo-${employeeId}-${month}-${year}`));
  return Math.floor(rng() * 7);
}

function isAdjacentToWeeklyOff(date: Date, woSet: Set<string>) {
  const prev = new Date(date);
  prev.setDate(date.getDate() - 1);
  const next = new Date(date);
  next.setDate(date.getDate() + 1);
  return woSet.has(toIso(prev)) || woSet.has(toIso(next));
}

function hasAdjacent(list: Date[], date: Date) {
  return list.some((d) => Math.abs(d.getDate() - date.getDate()) === 1);
}

function solveCandidates(paydays: number, plLocked: number, openCount: number): SolveCandidate[] {
  const hasHalf = Math.round(paydays * 2) % 2 === 1;
  const minH = hasHalf ? 1 : 0;
  const candidates: SolveCandidate[] = [];

  for (let h = minH; h <= 3; h += 1) {
    for (let plExtra = 0; plExtra <= 1; plExtra += 1) {
      const p = paydays - plLocked - plExtra - h * 0.5;
      if (p < 0) continue;
      if (Math.abs(p - Math.round(p)) > 1e-9) continue;
      const pInt = Math.round(p);
      const a = openCount - (h + plExtra + pInt);
      if (a < 0) continue;
      candidates.push({ hCount: h, plExtraCount: plExtra, pCount: pInt, aCount: a });
    }
  }

  return candidates.sort((a, b) => {
    if (a.plExtraCount !== b.plExtraCount) return a.plExtraCount - b.plExtraCount;
    if (a.hCount !== b.hCount) return a.hCount - b.hCount;
    return b.pCount - a.pCount;
  });
}

function validateNoLongAbsentBlocks(days: Date[], statusMap: Map<string, FinalStatus>, woSet: Set<string>) {
  let run: Date[] = [];
  for (const date of days) {
    const iso = toIso(date);
    const s = statusMap.get(iso) || "A";
    if (s === "A") {
      run.push(date);
    } else if (run.length > 0) {
      if (run.length > 3) {
        const aroundWeekend = run.some((d) => isAdjacentToWeeklyOff(d, woSet));
        if (!aroundWeekend) return false;
      }
      run = [];
    }
  }
  if (run.length > 3) {
    const aroundWeekend = run.some((d) => isAdjacentToWeeklyOff(d, woSet));
    if (!aroundWeekend) return false;
  }
  return true;
}

function validatePresentEvery4WorkingDays(
  days: Date[],
  statusMap: Map<string, FinalStatus>,
  lockedSet: Set<string>
) {
  const workingTrack = days.filter((d) => !lockedSet.has(toIso(d)));
  for (let i = 0; i + 3 < workingTrack.length; i += 1) {
    const window = workingTrack.slice(i, i + 4);
    const hasPresent = window.some((d) => (statusMap.get(toIso(d)) || "A") === "P");
    if (!hasPresent) return false;
  }
  return true;
}

function validatePresentSpread(days: Date[], statusMap: Map<string, FinalStatus>, lockedSet: Set<string>, pCount: number) {
  if (pCount < 3) return true;
  const working = days.filter((d) => !lockedSet.has(toIso(d)));
  const segmentSize = Math.ceil(working.length / 3);
  const segments = [working.slice(0, segmentSize), working.slice(segmentSize, segmentSize * 2), working.slice(segmentSize * 2)];
  const minPerSegment = Math.max(1, Math.floor(pCount / 6));
  const counts = segments.map((seg) =>
    seg.reduce((acc, d) => acc + ((statusMap.get(toIso(d)) || "A") === "P" ? 1 : 0), 0)
  );
  return counts.every((count) => count >= minPerSegment);
}

function selectHalfDays(
  openDays: Date[],
  count: number,
  daysInMonth: number,
  rng: () => number
): Date[] | null {
  if (count === 0) return [];
  const mid = Math.ceil(daysInMonth / 2);
  const candidates = openDays
    .filter((d) => d.getDate() > 3 && d.getDate() <= daysInMonth - 3)
    .map((d) => ({ date: d, dist: Math.abs(d.getDate() - mid), tie: rng() }))
    .sort((a, b) => (a.dist - b.dist) || (a.tie - b.tie))
    .map((x) => x.date);

  const selected: Date[] = [];
  for (const date of candidates) {
    if (selected.length >= count) break;
    if (hasAdjacent(selected, date)) continue;
    selected.push(date);
  }
  return selected.length === count ? selected : null;
}

function selectPlExtraDays(
  openDays: Date[],
  count: number,
  woSet: Set<string>,
  rng: () => number
): Date[] | null {
  if (count === 0) return [];
  const preferred = openDays.filter((d) => !isAdjacentToWeeklyOff(d, woSet));
  const preferredShuffled = shuffleDeterministic(preferred, rng);
  if (preferredShuffled.length >= count) return preferredShuffled.slice(0, count);
  const allShuffled = shuffleDeterministic(openDays, rng);
  if (allShuffled.length >= count) return allShuffled.slice(0, count);
  return null;
}

function buildRecordsForEmployee(
  employee: EmployeeContext,
  month: number,
  year: number,
  holidays: Set<string>,
  shiftConfig: ShiftConfig,
  attemptSeed: number
): { records: AttendanceOutputRow[]; reason: string } | null {
  const days = getMonthDays(month, year);
  const rng = createSeededRandom(attemptSeed);
  const targetCredits = Number(employee.payDays || 0);
  if (targetCredits < 0) return null;

  const holidaySet = new Set<string>();
  const woSet = new Set<string>();
  const statusMap = new Map<string, FinalStatus>();
  const workingCandidates: Date[] = [];
  for (const day of days) {
    const iso = toIso(day);
    if (holidays.has(iso)) {
      holidaySet.add(iso);
      statusMap.set(iso, "PL");
      continue;
    }
    if (day.getDay() === employee.weeklyOffDay) {
      woSet.add(iso);
      statusMap.set(iso, "WO");
      continue;
    }
    workingCandidates.push(day);
  }

  if (workingCandidates.length === 0) return null;

  // Excel-style additional PL: exactly one random PL in open days, in addition to holidays.
  const shuffledOpen = shuffleDeterministic(workingCandidates, rng);
  const extraPlDay = shuffledOpen[0];
  if (!extraPlDay) return null;
  const extraPlIso = toIso(extraPlDay);
  statusMap.set(extraPlIso, "PL");

  const assignableDays = workingCandidates.filter((d) => toIso(d) !== extraPlIso);
  const totalPlCredits = holidaySet.size + 1;
  const remainingCredits = targetCredits - totalPlCredits;
  if (remainingCredits < 0) return null;

  const hasHalfTarget = Math.round(targetCredits * 2) % 2 === 1;
  const halfOptions = hasHalfTarget ? [1] : shuffleDeterministic([0, 1, 2, 3], rng);

  let chosenHalfCount = -1;
  let chosenPresentCount = -1;
  for (const hCount of halfOptions) {
    if (hCount > assignableDays.length) continue;
    const pCountRaw = remainingCredits - hCount * 0.5;
    if (pCountRaw < 0) continue;
    if (Math.abs(pCountRaw - Math.round(pCountRaw)) > 1e-9) continue;
    const pCount = Math.round(pCountRaw);
    if (pCount < 0) continue;
    if (pCount + hCount > assignableDays.length) continue;
    chosenHalfCount = hCount;
    chosenPresentCount = pCount;
    break;
  }
  if (chosenHalfCount < 0 || chosenPresentCount < 0) return null;

  const shuffledAssignable = shuffleDeterministic(assignableDays, rng);
  const halfDays = new Set<string>(
    shuffledAssignable.slice(0, chosenHalfCount).map((d) => toIso(d))
  );
  const presentDays = new Set<string>(
    shuffledAssignable
      .filter((d) => !halfDays.has(toIso(d)))
      .slice(0, chosenPresentCount)
      .map((d) => toIso(d))
  );

  assignableDays.forEach((d) => {
    const iso = toIso(d);
    if (halfDays.has(iso)) statusMap.set(iso, "H");
    else if (presentDays.has(iso)) statusMap.set(iso, "P");
    else statusMap.set(iso, "A");
  });

  const fixedShiftStart: Record<ShiftKey, number> = {
    G: 9 * 60 + 30,
    A: 8 * 60,
    B: 16 * 60,
    C: 30,
  };

  const shiftStart = fixedShiftStart[employee.shift] ?? shiftConfig.shifts[employee.shift].start;
  const records: AttendanceOutputRow[] = [];
  const seedText = String(attemptSeed);
  for (const date of days) {
    const iso = toIso(date);
    const status = (statusMap.get(iso) || "A") as FinalStatus;
    if (status === "P" || status === "H") {
      const inOffset = Math.floor(rng() * 11); // 0..10
      const inSign = rng() < 0.5 ? -1 : 1;
      const inTimeMinutes = shiftStart + inSign * inOffset;
      const targetWorkMinutes = status === "P" ? 8 * 60 : 4 * 60;
      const breakMinutes = 60;
      const maxOtMinutes = Math.max(0, Math.min(4 * 60, 12 * 60 - (targetWorkMinutes + breakMinutes)));
      const otMinutes = Math.floor(rng() * (maxOtMinutes + 1));
      const outTimeMinutes = inTimeMinutes + targetWorkMinutes + breakMinutes + otMinutes;
      const workHours = round2((targetWorkMinutes + otMinutes) / 60);
      const derivedOtHours = round2(Math.max(0, workHours - 8));

      records.push({
        employeeId: employee.employeeId,
        date,
        status,
        generationSeed: seedText,
        inTime: formatTime(inTimeMinutes),
        outTime: formatTime(outTimeMinutes),
        breakMinutes,
        workHours,
        otHours: derivedOtHours,
        month,
        year,
      });
    } else {
      records.push({
        employeeId: employee.employeeId,
        date,
        status,
        generationSeed: seedText,
        inTime: null,
        outTime: null,
        breakMinutes: 0,
        workHours: 0,
        otHours: 0,
        month,
        year,
      });
    }
  }

  const validationError = validateGeneratedRecords(records, targetCredits);
  if (validationError) return null;
  return { records, reason: "credit-driven exact match" };
}

function validateGeneratedRecords(records: AttendanceOutputRow[], targetCredits: number): string | null {
  let credits = 0;
  for (const row of records) {
    const hasIn = Boolean(row.inTime);
    const hasOut = Boolean(row.outTime);
    if (hasIn !== hasOut) return "In/Out time mismatch";
    if ((row.status === "P" || row.status === "H") && (!hasIn || !hasOut)) {
      return `Missing times for status ${row.status}`;
    }
    if ((row.status === "A" || row.status === "WO" || row.status === "PL") && (hasIn || hasOut)) {
      return `Invalid times for status ${row.status}`;
    }
    if ((row.status === "A" || row.status === "WO" || row.status === "PL") && (row.workHours !== 0 || row.otHours !== 0)) {
      return `Non-zero hours for status ${row.status}`;
    }

    if (row.status === "P" || row.status === "PL") credits += 1;
    else if (row.status === "H") credits += 0.5;
  }

  if (Math.abs(credits - targetCredits) > 1e-9) {
    return `Credit mismatch (${credits} vs ${targetCredits})`;
  }
  return null;
}

function buildFallbackRecordsForEmployee(
  employee: EmployeeContext,
  month: number,
  year: number,
  holidays: Set<string>,
  shiftConfig: ShiftConfig
): { records: AttendanceOutputRow[]; reason: string } {
  const days = getMonthDays(month, year);
  const holidaySet = new Set(days.filter((d) => holidays.has(toIso(d))).map((d) => toIso(d)));
  const woSet = new Set(
    days
      .filter((d) => !holidaySet.has(toIso(d)) && d.getDay() === employee.weeklyOffDay)
      .map((d) => toIso(d))
  );
  const lockedSet = new Set([...holidaySet, ...woSet]);
  const openDays = days.filter((d) => !lockedSet.has(toIso(d)));

  const baseCredits = holidaySet.size;
  const targetCredits = Number(employee.payDays || 0);
  let remainingCredits = targetCredits - baseCredits;
  if (remainingCredits < 0) remainingCredits = 0;
  if (remainingCredits > openDays.length) remainingCredits = openDays.length;

  const fractional = remainingCredits - Math.floor(remainingCredits);
  const halfNeeded = Math.abs(fractional - 0.5) <= 1e-9 ? 1 : 0;
  let pCount = Math.floor(remainingCredits);
  if (pCount + halfNeeded > openDays.length) {
    pCount = Math.max(0, openDays.length - halfNeeded);
  }

  const statusMap = new Map<string, FinalStatus>();
  holidaySet.forEach((iso) => statusMap.set(iso, "PL"));
  woSet.forEach((iso) => statusMap.set(iso, "WO"));

  const pTargets = new Set<number>();
  if (pCount > 0) {
    for (let i = 0; i < pCount; i += 1) {
      const idx = Math.floor((i * openDays.length) / pCount);
      pTargets.add(Math.min(openDays.length - 1, idx));
    }
    // Fill any gap caused by duplicate indices deterministically from month start.
    for (let idx = 0; pTargets.size < pCount && idx < openDays.length; idx += 1) {
      pTargets.add(idx);
    }
  }

  let assignedH = 0;
  openDays.forEach((date, idx) => {
    const iso = toIso(date);
    if (pTargets.has(idx)) {
      statusMap.set(iso, "P");
    } else if (assignedH < halfNeeded) {
      statusMap.set(iso, "H");
      assignedH += 1;
    } else {
      statusMap.set(iso, "A");
    }
  });

  const shiftSlot = shiftConfig.shifts[employee.shift];
  const shiftDuration = durationMinutes(shiftSlot.start, shiftSlot.end);
  const fullWork = Math.max(0, shiftDuration - 60);
  const halfWork = Math.max(0, Math.floor(fullWork / 2));

  let credits = 0;
  const records: AttendanceOutputRow[] = [];
  for (const date of days) {
    const iso = toIso(date);
    const status = (statusMap.get(iso) || "A") as FinalStatus;
    if (status === "P") {
      credits += 1;
      const inTimeMinutes = shiftSlot.start;
      const outTimeMinutes = inTimeMinutes + 60 + fullWork;
      records.push({
        employeeId: employee.employeeId,
        date,
        status,
        generationSeed: `fallback-${employee.baseSeed}`,
        inTime: formatTime(inTimeMinutes),
        outTime: formatTime(outTimeMinutes),
        breakMinutes: 60,
        workHours: round2(fullWork / 60),
        otHours: 0,
        month,
        year,
      });
    } else if (status === "PL") {
      credits += 1;
      records.push({
        employeeId: employee.employeeId,
        date,
        status,
        generationSeed: `fallback-${employee.baseSeed}`,
        inTime: null,
        outTime: null,
        breakMinutes: 0,
        workHours: 0,
        otHours: 0,
        month,
        year,
      });
    } else if (status === "H") {
      credits += 0.5;
      const inTimeMinutes = shiftSlot.start;
      const outTimeMinutes = inTimeMinutes + 60 + halfWork;
      records.push({
        employeeId: employee.employeeId,
        date,
        status,
        generationSeed: `fallback-${employee.baseSeed}`,
        inTime: formatTime(inTimeMinutes),
        outTime: formatTime(outTimeMinutes),
        breakMinutes: 60,
        workHours: round2(halfWork / 60),
        otHours: 0,
        month,
        year,
      });
    } else {
      records.push({
        employeeId: employee.employeeId,
        date,
        status,
        generationSeed: `fallback-${employee.baseSeed}`,
        inTime: null,
        outTime: null,
        breakMinutes: 0,
        workHours: 0,
        otHours: 0,
        month,
        year,
      });
    }
  }

  const exact = Math.abs(credits - targetCredits) <= 1e-9;
  return {
    records,
    reason: exact
      ? "fallback credits-only sequential distribution"
      : `fallback credits adjusted (${credits} vs target ${targetCredits})`,
  };
}

export async function loadInOutGeneratorInputs(clientId: string, month: number, year: number) {
  const [shiftConfig, holidays, payrollRows, employees] = await Promise.all([
    loadShiftConfig(clientId),
    loadHolidaySet(clientId, year),
    loadPayrollRows(clientId, month, year),
    prisma.employee.findMany({
      where: { clientId },
      select: { id: true, empNo: true, fullName: true, gender: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!shiftConfig) return { error: "Shift timing not configured for this client" as const };
  if (shiftConfig.enabledShifts.length === 0) return { error: "No shift is enabled for this client" as const };

  const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));
  const matchedEmployees: EmployeeContext[] = [];
  const warnings: Array<{ employeeId: string; empCode: string; employeeName: string; reason: string }> = [];
  for (const payroll of payrollRows) {
    if (!payroll.employeeId) {
      warnings.push({
        employeeId: "",
        empCode: payroll.empCode || "",
        employeeName: payroll.employeeName || "",
        reason: "Payroll row is not mapped to employee master",
      });
      continue;
    }
    const employee = employeeMap.get(payroll.employeeId);
    if (!employee) {
      warnings.push({
        employeeId: payroll.employeeId,
        empCode: payroll.empCode || "",
        employeeName: payroll.employeeName || "",
        reason: "Mapped employee not found in employee master",
      });
      continue;
    }
    const shift = chooseShiftForEmployee(employee.id, employee.gender, shiftConfig.enabledShifts);
    const weeklyOffDay = chooseWeeklyOffDay(employee.id, employee.gender, shift, month, year);
    matchedEmployees.push({
      employeeId: employee.id,
      empCode: payroll.empCode || (employee.empNo || "").trim(),
      employeeName: payroll.employeeName || employee.fullName || "",
      payDays: payroll.payDays,
      otHoursTarget: payroll.otHoursTarget,
      gender: employee.gender,
      shift,
      weeklyOffDay,
      baseSeed: hashSeed(`${clientId}-${employee.id}-${month}-${year}`),
    });
  }

  if (matchedEmployees.length === 0) {
    return {
      error: "No payroll mapped employees" as const,
      warnings,
      missingEmployeePayroll: warnings.map(({ employeeId, empCode, employeeName }) => ({
        employeeId,
        empCode,
        employeeName,
      })),
    };
  }

  return {
    shiftConfig,
    holidays,
    matchedEmployees,
    warnings,
    // Backward-compatible alias for existing service consumers in this phase.
    employees: matchedEmployees,
    daysInMonth: getMonthDays(month, year).length,
  };
}

export async function generateInOutForClient(clientId: string, month: number, year: number) {
  const loaded = await loadInOutGeneratorInputs(clientId, month, year);
  if ("error" in loaded) {
    return {
      error: loaded.error,
      missingEmployeePayroll:
        "missingEmployeePayroll" in loaded ? loaded.missingEmployeePayroll : [],
    };
  }

  const successEmployees: Array<{ employeeId: string; empCode: string; seed: string; message: string }> = [];
  const failedEmployees: Array<{ employeeId: string; empCode: string; reason: string }> = [];
  let fallbackCount = 0;
  let inserted = 0;

  for (const employee of loaded.employees) {
    let result: { records: AttendanceOutputRow[]; reason: string } | null = null;
    let failureReason = "Validation failed";

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const attemptSeed = hashSeed(`${employee.baseSeed}-attempt-${attempt}`);
      const generated = buildRecordsForEmployee(
        employee,
        month,
        year,
        loaded.holidays,
        loaded.shiftConfig,
        attemptSeed
      );
      if (generated) {
        result = generated;
        break;
      }
      failureReason = `No valid placement in attempt ${attempt + 1}`;
    }

    if (!result) {
      failedEmployees.push({
        employeeId: employee.employeeId,
        empCode: employee.empCode,
        reason: failureReason,
      });
      logger.warn("inout.employee.failed", {
        clientId,
        month,
        year,
        employeeId: employee.employeeId,
        empCode: employee.empCode,
        reason: failureReason,
      });
      result = buildFallbackRecordsForEmployee(
        employee,
        month,
        year,
        loaded.holidays,
        loaded.shiftConfig
      );
      fallbackCount += 1;
    }

    let validationError = validateGeneratedRecords(result.records, employee.payDays);
    if (validationError) {
      for (let attempt = 20; attempt < 40; attempt += 1) {
        const attemptSeed = hashSeed(`${employee.baseSeed}-recheck-${attempt}`);
        const regenerated = buildRecordsForEmployee(
          employee,
          month,
          year,
          loaded.holidays,
          loaded.shiftConfig,
          attemptSeed
        );
        if (!regenerated) continue;
        validationError = validateGeneratedRecords(regenerated.records, employee.payDays);
        if (!validationError) {
          result = regenerated;
          break;
        }
      }
    }
    if (validationError) {
      failedEmployees.push({
        employeeId: employee.employeeId,
        empCode: employee.empCode,
        reason: validationError,
      });
      logger.warn("inout.employee.invalid.before.upsert", {
        clientId,
        month,
        year,
        employeeId: employee.employeeId,
        empCode: employee.empCode,
        reason: validationError,
      });
      continue;
    }

    await prisma.$transaction(
      result.records.map((row) =>
        prisma.attendance.upsert({
          where: { employeeId_date: { employeeId: row.employeeId, date: row.date } },
          update: {
            status: row.status,
            generationSeed: row.generationSeed,
            inTime: row.inTime,
            outTime: row.outTime,
            breakMinutes: row.breakMinutes,
            workHours: row.workHours,
            otHours: row.otHours,
            month: row.month,
            year: row.year,
          },
          create: {
            employeeId: row.employeeId,
            date: row.date,
            status: row.status,
            generationSeed: row.generationSeed,
            inTime: row.inTime,
            outTime: row.outTime,
            breakMinutes: row.breakMinutes,
            workHours: row.workHours,
            otHours: row.otHours,
            month: row.month,
            year: row.year,
          },
        })
      )
    );

    inserted += result.records.length;
    successEmployees.push({
      employeeId: employee.employeeId,
      empCode: employee.empCode,
      seed: result.records[0]?.generationSeed || String(employee.baseSeed),
      message: result.reason,
    });
    logger.info("inout.employee.success", {
      clientId,
      month,
      year,
      employeeId: employee.employeeId,
      empCode: employee.empCode,
      seed: result.records[0]?.generationSeed || String(employee.baseSeed),
      reason: result.reason,
    });
  }

  return {
    inserted,
    employees: loaded.employees.length,
    successCount: successEmployees.length,
    failureCount: failedEmployees.length,
    successEmployees,
    failedEmployees,
    daysInMonth: loaded.daysInMonth,
    partialSuccess: failedEmployees.length > 0,
    fallbackUsed: fallbackCount > 0,
  };
}

export async function previewInOutGenerator(clientId: string, month: number, year: number) {
  const loaded = await loadInOutGeneratorInputs(clientId, month, year);
  if ("error" in loaded) return loaded;
  return {
    daysInMonth: loaded.daysInMonth,
    holidaysCount: loaded.holidays.size,
    employees: loaded.employees.map((row) => ({
      employeeId: row.employeeId,
      empCode: row.empCode,
      employeeName: row.employeeName,
      payDays: row.payDays,
      otHoursTarget: row.otHoursTarget,
      gender: row.gender,
      shift: row.shift,
      weeklyOff: weekendName(row.weeklyOffDay),
      generationSeed: String(row.baseSeed),
    })),
  };
}

export async function loadAttendanceResultView(clientId: string, month: number, year: number) {
  const daysInMonth = getMonthDays(month, year).length;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const employees = await prisma.employee.findMany({
    where: { clientId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      empNo: true,
      fullName: true,
      attendances: {
        where: { month, year },
        select: { date: true, status: true, inTime: true, outTime: true, otHours: true },
      },
    },
  });

  const rows = employees.map((employee) => {
    let present = 0;
    let pl = 0;
    let half = 0;
    let wo = 0;
    let absent = 0;
    let otHours = 0;
    const byDay = new Map<number, { status: string; inTime: string | null; outTime: string | null }>();

    employee.attendances.forEach((att) => {
      const derivedStatus = att.status;
      const day = new Date(att.date).getDate();
      byDay.set(day, { status: derivedStatus, inTime: att.inTime, outTime: att.outTime });
      if (derivedStatus === "P") present += 1;
      else if (derivedStatus === "PL") pl += 1;
      else if (derivedStatus === "H") half += 1;
      else if (derivedStatus === "WO") wo += 1;
      else absent += 1;
      otHours += Number(att.otHours || 0);
    });

    return {
      employeeId: employee.id,
      empCode: employee.empNo || "",
      employeeName: employee.fullName || "",
      present,
      pl,
      half,
      wo,
      absent,
      otHours: round2(otHours),
      status: employee.attendances.length > 0 ? "Generated" : "Not Generated",
      days: days.map((day) => ({
        day,
        ...(byDay.get(day) || { status: "-", inTime: null, outTime: null }),
      })),
    };
  });

  return { days, rows };
}
