import type { WeekendType } from "@prisma/client";
import { resolveWeeklyOffDay } from "@/lib/shift-master-service";

export type PayrollMasterSkillCategory = 1 | 2 | 3;

export type PayrollMasterCalcInput = {
  uanNo: string | number | null | undefined;
  esicNo: string | number | null | undefined;
  actualRateOfPay: number;
  skillCategory: PayrollMasterSkillCategory;
  actualWorkingDays: number;
  monthlyCapDaysY: number;
  otherBenefit: number;
  tds: number;
  loan: number;
  adv: number;
  tea: number;
  lwf: number;
};

export type PayrollMasterCalc = {
  minimumWagesL: number;
  basic50N: number;
  hra40O: number;
  actualPayableGrossP: number;
  totalPayableAmountQ: number;
  divisorR: number;
  otS: number;
  rateOfPayT: number;
  basicU: number;
  hraV: number;
  actualAttendanceW: number;
  rateOfWagesX: number;
  monthlyCapDaysY: number;
  actualPayableZ: number;
  adjustedDaysAA: number;
  truncAB: number;
  payDaysAC: number;
  otHoursAD: number;
  minWageAE: number;
  minWageAF: number;
  esicAG: number;
  basicRateAH: number;
  hraRateAI: number;
  pfApplicabilityAJ: number;
  esicApplicabilityAK: number;
  basicAL: number;
  hraAM: number;
  otherBenefitAN: number;
  totalAO: number;
  otAmountAP: number;
  grandTotalAQ: number;
  pfAR: number;
  esicAS: number;
  profTaxAT: number;
  tdsAU: number;
  loanAV: number;
  advAW: number;
  teaAX: number;
  lwfAY: number;
  totalDeductionAZ: number;
  netPayableBA: number;
  signatureBB: string;
  totalBF: number;
};

export type PayrollMasterWeeklyOffResolution = {
  weeklyOffDay: number;
  monthlyCapDaysY: number;
};

const STANDARD_DAYS = 26;
const MIN_RATE_T = 21060;

function toNumber(value: string | number | null | undefined, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).replace(/,/g, "").trim();
  if (!normalized) return fallback;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : fallback;
}

function round0(value: number): number {
  return Math.round(value);
}

function trunc(value: number): number {
  return value < 0 ? Math.ceil(value) : Math.trunc(value);
}

function roundDown0(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? Math.ceil(value) : Math.floor(value);
}

function floorHalf(value: number): number {
  return Math.floor(value / 0.5) * 0.5;
}

function safeDiv(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return 0;
  return a / b;
}

export function minWageBySkill(skillCategory: PayrollMasterSkillCategory): number {
  if (skillCategory === 1) return 511;
  if (skillCategory === 2) return 501;
  return 491;
}

export function weekdayName(day: number) {
  return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][day] || "SUN";
}

export function countWeekdayInMonth(year: number, monthIndex: number, weekday: number): number {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const current = new Date(year, monthIndex, day).getDay();
    if (current === weekday) count += 1;
  }
  return count;
}

export function fixedWeekendToDay(weekendType: Exclude<WeekendType, "ROTATIONAL">): number {
  if (weekendType === "MON") return 1;
  if (weekendType === "TUE") return 2;
  if (weekendType === "WED") return 3;
  if (weekendType === "THU") return 4;
  if (weekendType === "FRI") return 5;
  if (weekendType === "SAT") return 6;
  return 0;
}

export function deriveMonthlyCapDaysByWeekoff(
  year: number,
  monthIndex: number,
  weeklyOffDay: number
): number {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const weeklyOffCount = countWeekdayInMonth(year, monthIndex, weeklyOffDay);
  const cap = daysInMonth - weeklyOffCount;
  return cap < 0 ? 0 : cap;
}

export function resolvePayrollMasterWeeklyOffAndCap(params: {
  clientId: string;
  employeeId: string;
  year: number;
  monthIndex: number;
  weekendType: WeekendType;
}): PayrollMasterWeeklyOffResolution {
  const weeklyOffDay =
    params.weekendType === "ROTATIONAL"
      ? resolveWeeklyOffDay({
          clientId: params.clientId,
          employeeId: params.employeeId,
          month: params.monthIndex + 1,
          year: params.year,
          weekendType: "ROTATIONAL",
        })
      : fixedWeekendToDay(params.weekendType);

  return {
    weeklyOffDay,
    monthlyCapDaysY: deriveMonthlyCapDaysByWeekoff(
      params.year,
      params.monthIndex,
      weeklyOffDay
    ),
  };
}

export function calcPayrollMaster(input: PayrollMasterCalcInput): PayrollMasterCalc {
  const monthlyCapDaysY = Math.max(0, toNumber(input.monthlyCapDaysY, 0));
  const minimumWagesL = minWageBySkill(input.skillCategory);

  const basic50N = round0(input.actualRateOfPay * 0.55 * input.actualWorkingDays);
  const hra40O = round0(input.actualRateOfPay * 0.45 * input.actualWorkingDays);
  const actualPayableGrossP = basic50N + hra40O;
  const totalPayableAmountQ = round0(input.actualRateOfPay * input.actualWorkingDays);

  const rateOfPayT =
    input.actualRateOfPay * STANDARD_DAYS >= MIN_RATE_T
      ? input.actualRateOfPay * STANDARD_DAYS
      : MIN_RATE_T;
  const rateOfWagesX = round0(rateOfPayT / STANDARD_DAYS);
  const divisorR = safeDiv(rateOfWagesX, 8);
  const actualPayableZ = totalPayableAmountQ;
  const actualAttendanceW = safeDiv(actualPayableZ, rateOfWagesX);
  const adjustedDaysAA = actualAttendanceW >= monthlyCapDaysY ? monthlyCapDaysY : actualAttendanceW;
  const truncAB = trunc(adjustedDaysAA);
  const payDaysAC = floorHalf(adjustedDaysAA);

  const pfApplicabilityAJ = toNumber(input.uanNo) >= 1000000 ? 1 : 0;
  const esicApplicabilityAK = toNumber(input.esicNo) >= 1000000 ? 1 : 0;

  const minWageAE =
    rateOfWagesX * 0.55 <= minimumWagesL ? minimumWagesL : rateOfWagesX * 0.55;
  const minWageAF = round0(pfApplicabilityAJ === 1 ? rateOfWagesX * 0.55 : 585);
  const esicAG = round0(esicApplicabilityAK === 1 ? rateOfWagesX * 0.55 : 810);
  const basicRateAH = Math.max(minWageAE, minWageAF, esicAG);
  const hraRateAI = rateOfWagesX - basicRateAH;

  const basicAL = round0(payDaysAC * basicRateAH);
  const hraAM = round0((rateOfWagesX - basicRateAH) * payDaysAC);
  const otS = round0(actualPayableZ - (basicAL + hraAM));
  const otHoursAD = safeDiv(roundDown0(safeDiv(otS, safeDiv(rateOfWagesX, 8))), 2);

  const basicU = basicRateAH * STANDARD_DAYS;
  const hraV = hraRateAI * STANDARD_DAYS;
  const otherBenefitAN = toNumber(input.otherBenefit);
  const totalAO = basicAL + hraAM + otherBenefitAN;
  const otAmountAP = round0(divisorR * otHoursAD) * 2;
  const grandTotalAQ = totalAO + otAmountAP;

  const pfAR = (() => {
    if (pfApplicabilityAJ * basicAL >= 15001) return round0(15000 * 0.12);
    if (basicAL * pfApplicabilityAJ >= 100) return round0(basicAL * 0.12);
    return 0;
  })();
  const esicAS =
    esicApplicabilityAK === 0
      ? 0
      : round0(basicRateAH * STANDARD_DAYS >= 21000 ? 0 : basicAL * 0.0075);
  const profTaxAT = grandTotalAQ > 11999 ? 200 : 0;
  const tdsAU = toNumber(input.tds);
  const loanAV = toNumber(input.loan);
  const advAW = toNumber(input.adv);
  const teaAX = toNumber(input.tea);
  const lwfAY = toNumber(input.lwf);
  const totalDeductionAZ =
    pfAR + esicAS + profTaxAT + tdsAU + loanAV + advAW + teaAX + lwfAY;
  const netPayableBA = grandTotalAQ - totalDeductionAZ;
  const totalBF = netPayableBA + profTaxAT + esicAS + pfAR;

  return {
    minimumWagesL,
    basic50N,
    hra40O,
    actualPayableGrossP,
    totalPayableAmountQ,
    divisorR,
    otS,
    rateOfPayT,
    basicU,
    hraV,
    actualAttendanceW,
    rateOfWagesX,
    monthlyCapDaysY,
    actualPayableZ,
    adjustedDaysAA,
    truncAB,
    payDaysAC,
    otHoursAD,
    minWageAE,
    minWageAF,
    esicAG,
    basicRateAH,
    hraRateAI,
    pfApplicabilityAJ,
    esicApplicabilityAK,
    basicAL,
    hraAM,
    otherBenefitAN,
    totalAO,
    otAmountAP,
    grandTotalAQ,
    pfAR,
    esicAS,
    profTaxAT,
    tdsAU,
    loanAV,
    advAW,
    teaAX,
    lwfAY,
    totalDeductionAZ,
    netPayableBA,
    signatureBB: "BANK",
    totalBF,
  };
}
