export type ComplianceScheduleCategory = "TRAINING" | "COMMITTEE";

export type ComplianceScheduleRow = {
  title: string;
  scheduledFor: Date;
  scheduledLabel: string;
  scheduledIso: string;
};

type GenerateComplianceScheduleInput = {
  titles: string[];
  holidays?: string[];
  countPerTitle?: number;
  seedPrefix?: string;
  fromDate?: Date;
};

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDdMmYyyy(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function addDays(base: Date, days: number) {
  const copy = new Date(base);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addMonths(base: Date, months: number) {
  const copy = new Date(base);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function randInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function sanitizeTitles(values: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    output.push(trimmed);
  }

  return output;
}

function sanitizeHolidayInput(values: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;

    const dmy = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(trimmed);
    if (dmy) {
      const iso = `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
      if (!seen.has(iso)) {
        seen.add(iso);
        output.push(iso);
      }
      continue;
    }

    const direct = new Date(trimmed);
    if (Number.isNaN(direct.getTime())) continue;
    const iso = toIsoDate(direct);
    if (!seen.has(iso)) {
      seen.add(iso);
      output.push(iso);
    }
  }

  return output;
}

function moveToNextWorkingDay(date: Date, holidays: Set<string>) {
  let current = new Date(date);
  while (holidays.has(toIsoDate(current))) {
    current = addDays(current, 1);
  }
  return current;
}

export function generateFutureComplianceSchedule({
  titles,
  holidays = [],
  countPerTitle = 4,
  seedPrefix = "",
  fromDate = new Date(),
}: GenerateComplianceScheduleInput): ComplianceScheduleRow[] {
  const cleanTitles = sanitizeTitles(titles);
  const holidaySet = new Set(sanitizeHolidayInput(holidays));
  const rows: ComplianceScheduleRow[] = [];

  for (const title of cleanTitles) {
    const seed = hashSeed(`${seedPrefix}:${title.toLowerCase()}:${fromDate.getFullYear()}`);
    const rng = createSeededRandom(seed);

    // first date: 10-40 days in the future
    let nextDate = addDays(fromDate, randInt(rng, 10, 40));
    nextDate = moveToNextWorkingDay(nextDate, holidaySet);

    for (let i = 0; i < countPerTitle; i += 1) {
      if (i > 0) {
        // Keep the repetition around 3 months with slight day variance only.
        nextDate = addMonths(nextDate, 3);
        nextDate = addDays(nextDate, randInt(rng, -3, 3));
        nextDate = moveToNextWorkingDay(nextDate, holidaySet);
      }

      rows.push({
        title,
        scheduledFor: new Date(nextDate),
        scheduledIso: toIsoDate(nextDate),
        scheduledLabel: formatDdMmYyyy(nextDate),
      });
    }
  }

  return rows.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
}
