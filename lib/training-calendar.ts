export type TrainingMode = "reference" | "future";

export type TrainingRow = {
  name: string;
  type: "Training" | "Committee Meeting";
  dateIso: string;
  dateLabel: string;
};

export type HolidayRow = {
  dateIso: string;
  dateLabel: string;
};

export const HOLIDAYS: string[] = [
  "2026-01-26",
  "2026-03-14",
  "2026-08-15",
  "2026-10-02",
  "2026-11-12",
  "2026-12-25",
];

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDdMmYyyy(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
}

function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function createSeededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function skipHolidayForward(date: Date, holidays: Set<string>): Date {
  let result = new Date(date);
  while (holidays.has(toIsoDate(result))) {
    result = addDays(result, 1);
  }
  return result;
}

function sanitizeNames(values: string[]): string[] {
  const unique = new Set<string>();
  values.forEach((value) => {
    const trimmed = value.trim();
    if (trimmed) unique.add(trimmed);
  });
  return Array.from(unique);
}

function sanitizeHolidays(values: string[]): string[] {
  const unique = new Set<string>();
  values.forEach((value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
    if (!match) return;
    const [, dd, mm, yyyy] = match;
    const iso = `${yyyy}-${mm}-${dd}`;
    const parsed = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return;
    unique.add(iso);
  });
  return Array.from(unique).sort();
}

function addYears(base: Date, years: number): Date {
  const d = new Date(base);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function clampDate(value: Date, min: Date, max: Date): Date {
  if (value < min) return new Date(min);
  if (value > max) return new Date(max);
  return value;
}

function buildSchedule(trainingNames: string[], committeeNames: string[]) {
  const trainings = sanitizeNames(trainingNames).map((name) => ({
    name,
    type: "Training" as const,
  }));
  const committees = sanitizeNames(committeeNames).map((name) => ({
    name,
    type: "Committee Meeting" as const,
  }));

  return [...trainings, ...committees];
}

export function generateTrainingCalendar(
  mode: TrainingMode,
  now = new Date(),
  trainingNames: string[] = [],
  committeeNames: string[] = [],
  holidayInput: string[] = HOLIDAYS
) {
  const holidayList = sanitizeHolidays(holidayInput);
  const holidays = new Set(holidayList);
  const schedule = buildSchedule(trainingNames, committeeNames);
  const year = now.getFullYear();
  // 1-year window by mode.
  const windowStart = mode === "reference" ? addYears(now, -1) : new Date(now);
  const windowEnd = mode === "reference" ? new Date(now) : addYears(now, 1);

  const rows: TrainingRow[] = [];

  schedule.forEach((item) => {
    const itemSeed = hashSeed(`${mode}-${year}-${item.type}-${item.name.toLowerCase()}`);
    const itemRng = createSeededRandom(itemSeed);

    // 4 dates per name, around every 3 months with random month variance.
    const itemDates: Date[] = [];
    for (let i = 0; i < 4; i += 1) {
      // Month variance makes the month pattern look less uniform:
      // each step is around 3 months but can shift by -1..+1 month.
      const monthOffset = i * 3 + randInt(itemRng, -1, 1);

      // Day variance stays within requested range +/- 5 days.
      const dayOffset = randInt(itemRng, -5, 5);

      const anchor = addMonths(windowStart, monthOffset);
      const variedDate = addDays(anchor, dayOffset);
      const boundedDate = clampDate(variedDate, windowStart, windowEnd);
      const finalDate = skipHolidayForward(boundedDate, holidays);
      itemDates.push(finalDate);
    }

    itemDates
      .sort((a, b) => a.getTime() - b.getTime())
      .forEach((finalDate) => {
        rows.push({
          name: item.name,
          type: item.type,
          dateIso: toIsoDate(finalDate),
          dateLabel: formatDdMmYyyy(finalDate),
        });
      });

    return undefined;
  });

  rows.sort((a, b) => a.dateIso.localeCompare(b.dateIso));

  return {
    mode,
    generatedAt: now.toISOString(),
    page1: rows,
    page2: holidayList.map((holiday) => ({
      dateIso: holiday,
      dateLabel: formatDdMmYyyy(new Date(`${holiday}T00:00:00`)),
    })) as HolidayRow[],
  };
}
