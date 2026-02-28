"use client";

import { useEffect, useMemo, useState } from "react";
import ClientSidebar from "@/components/ClientSidebar";

type Employee = {
  id: string;
  empNo: string | null;
  employmentStatus: "ACTIVE" | "INACTIVE";
  uanNo: string | null;
  esicNo: string | null;
  fullName: string | null;
  currentDept: string | null;
  designation: string | null;
  doj: string | null;
  salaryWage: string | null;
  bankAcNo: string | null;
  ifscCode: string | null;
  bankName: string | null;
};

type PayrollInputs = {
  actualRateOfPay: number; // J
  skillCategory: 1 | 2 | 3; // K
  actualWorkingDays: number; // M
  otherBenefit: number; // AM
  tds: number; // AT
  loan: number; // AU
  adv: number; // AV
  tea: number; // AW
  lwf: number; // AX
};

type PayrollRow = {
  id: string;
  srNo: number; // A
  uanNo: string; // B
  esicNo: string; // C
  empNo: string; // D
  status: string; // E
  employeeName: string; // F
  department: string; // G
  designation: string; // H
  doj: string; // I
  bankAcNo: string; // BB
  ifscCode: string; // BC
  bankName: string; // BD
} & PayrollInputs;

type PayrollCalc = {
  minimumWagesL: number; // L
  basic50N: number; // N
  hra40O: number; // O
  actualPayableGrossP: number; // P
  totalPayableAmountQ: number; // Q
  divisorR: number; // R
  otS: number; // S
  rateOfPayT: number; // T
  basicU: number; // U
  hraV: number; // V
  actualAttendanceW: number; // W
  rateOfWagesX: number; // X
  actualPayableY: number; // Y
  adjustedDaysZ: number; // Z
  truncAA: number; // AA
  payDaysAB: number; // AB
  otHoursAC: number; // AC
  minWageAD: number; // AD
  minWageAE: number; // AE
  esicAF: number; // AF
  basicRateAG: number; // AG
  hraRateAH: number; // AH
  pfApplicabilityAI: number; // AI
  esicApplicabilityAJ: number; // AJ
  basicAK: number; // AK
  hraAL: number; // AL
  totalAN: number; // AN
  otAmountAO: number; // AO
  grandTotalAP: number; // AP
  pfAQ: number; // AQ
  esicAR: number; // AR
  profTaxAS: number; // AS
  totalDeductionAY: number; // AY
  netPayableAZ: number; // AZ
  signatureBA: string; // BA
  totalBE: number; // BE
};

const STANDARD_DAYS = 26;
const MIN_RATE_T = 21060;
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

function toNumber(value: string | null | undefined, fallback = 0): number {
  if (!value) return fallback;
  const normalized = String(value).replace(/,/g, "").trim();
  if (!normalized) return fallback;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeCode(value: string | null | undefined): string {
  return String(value || "").trim().toUpperCase().replace(/^0+/, "");
}

function round0(value: number): number {
  return Math.round(value);
}

function trunc(value: number): number {
  return value < 0 ? Math.ceil(value) : Math.trunc(value);
}

function floorHalf(value: number): number {
  return Math.floor(value / 0.5) * 0.5;
}

function safeDiv(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return 0;
  return a / b;
}

function minWageBySkill(skillCategory: 1 | 2 | 3): number {
  if (skillCategory === 1) return 511;
  if (skillCategory === 2) return 501;
  if (skillCategory === 3) return 491;
  return 0;
}

function calcPayroll(row: PayrollRow): PayrollCalc {
  // L = IF(K=1,511,IF(K=2,501,IF(K=3,491,0)))
  const minimumWagesL = minWageBySkill(row.skillCategory);

  // N,O,P,Q
  const basic50N = round0(row.actualRateOfPay * 0.55 * row.actualWorkingDays);
  const hra40O = round0(row.actualRateOfPay * 0.45 * row.actualWorkingDays);
  const actualPayableGrossP = basic50N + hra40O;
  const totalPayableAmountQ = round0(row.actualRateOfPay * row.actualWorkingDays);

  // T,X,R,Y,W,Z,AA,AB
  const rateOfPayT = row.actualRateOfPay * STANDARD_DAYS >= MIN_RATE_T
    ? row.actualRateOfPay * STANDARD_DAYS
    : MIN_RATE_T;
  const rateOfWagesX = round0(rateOfPayT / STANDARD_DAYS);
  const divisorR = safeDiv(rateOfWagesX, 8);
  const actualPayableY = totalPayableAmountQ;
  const actualAttendanceW = safeDiv(actualPayableY, rateOfWagesX);
  const adjustedDaysZ = actualAttendanceW >= STANDARD_DAYS ? STANDARD_DAYS : actualAttendanceW;
  const truncAA = trunc(adjustedDaysZ);
  const payDaysAB = floorHalf(adjustedDaysZ);

  // AI,AJ
  const pfApplicabilityAI = toNumber(row.uanNo) >= 1000000 ? 1 : 0;
  const esicApplicabilityAJ = toNumber(row.esicNo) >= 1000000 ? 1 : 0;

  // AD,AE,AF,AG,AH
  const minWageAD = rateOfWagesX * 0.55 <= minimumWagesL ? minimumWagesL : rateOfWagesX * 0.55;
  const minWageAE = round0(pfApplicabilityAI === 1 ? rateOfWagesX * 0.55 : 585);
  const esicAF = round0(esicApplicabilityAJ === 1 ? rateOfWagesX * 0.55 : 810);
  const basicRateAG = Math.max(minWageAD, minWageAE, esicAF);
  const hraRateAH = rateOfWagesX - basicRateAG;

  // AK,AL,S,AC
  const basicAK = round0(payDaysAB * basicRateAG);
  const hraAL = round0((rateOfWagesX - basicRateAG) * payDaysAB);
  const otS = round0(actualPayableY - (basicAK + hraAL));
  const otHoursAC = safeDiv(round0(safeDiv(otS, safeDiv(rateOfWagesX, 8))), 2);

  // U,V,AN,AO,AP
  const basicU = basicRateAG * STANDARD_DAYS;
  const hraV = hraRateAH * STANDARD_DAYS;
  const totalAN = basicAK + hraAL + row.otherBenefit;
  const otAmountAO = round0(divisorR * otHoursAC) * 2;
  const grandTotalAP = totalAN + otAmountAO;

  // AQ,AR,AS,AY,AZ,BE
  const pfAQ = (() => {
    if (pfApplicabilityAI * basicAK >= 15001) return round0(15000 * 0.12);
    if (basicAK * pfApplicabilityAI >= 100) return round0(basicAK * 0.12);
    return 0;
  })();
  const esicAR =
    esicApplicabilityAJ === 0
      ? 0
      : round0(basicRateAG * STANDARD_DAYS >= 21000 ? 0 : basicAK * 0.0075);
  const profTaxAS = grandTotalAP > 11999 ? 200 : 0;
  const totalDeductionAY =
    pfAQ + esicAR + profTaxAS + row.tds + row.loan + row.adv + row.tea + row.lwf;
  const netPayableAZ = grandTotalAP - totalDeductionAY;
  const totalBE = netPayableAZ + profTaxAS + esicAR + pfAQ;

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
    actualPayableY,
    adjustedDaysZ,
    truncAA,
    payDaysAB,
    otHoursAC,
    minWageAD,
    minWageAE,
    esicAF,
    basicRateAG,
    hraRateAH,
    pfApplicabilityAI,
    esicApplicabilityAJ,
    basicAK,
    hraAL,
    totalAN,
    otAmountAO,
    grandTotalAP,
    pfAQ,
    esicAR,
    profTaxAS,
    totalDeductionAY,
    netPayableAZ,
    signatureBA: "BANK",
    totalBE,
  };
}

function money(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString("en-IN") : "0";
}

export default function ClientPayrollPage() {
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [moduleEnabled, setModuleEnabled] = useState<boolean | null>(null);
  const today = new Date();
  const [payrollMonth, setPayrollMonth] = useState<number>(today.getMonth());
  const [payrollYear, setPayrollYear] = useState<number>(today.getFullYear());

  async function applyAdvanceForPeriod(month: number, year: number) {
    const res = await fetch(
      `/api/client/advance/amounts?month=${month}&year=${year}`,
      { cache: "no-store" }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data?.message || "Failed to load advance data for payroll.";
      setStatus(message);
      return;
    }

    const payload = data?.data ?? data;
    const amounts = (payload?.amounts || {}) as Record<string, number>;
    setRows((prev) =>
      prev.map((row) => {
        const code = normalizeCode(row.empNo);
        const nextAdv = code && Number.isFinite(amounts[code]) ? amounts[code] : 0;
        return row.adv === nextAdv ? row : { ...row, adv: nextAdv };
      })
    );
  }

  useEffect(() => {
    async function checkLogin() {
      const res = await fetch("/api/client/me");
      const data = await res.json();
      const loggedIn = data?.data?.loggedIn ?? data?.loggedIn ?? false;
      if (!loggedIn) window.location.href = "/signin";
      const accessRes = await fetch("/api/client/modules?module=payroll", { cache: "no-store" });
      const accessData = await accessRes.json().catch(() => ({}));
      if (!accessRes.ok || !accessData?.data?.enabled) {
        setModuleEnabled(false);
        setLoading(false);
        return false;
      }
      setModuleEnabled(true);
      return true;
    }

    async function loadEmployees() {
      setLoading(true);
      const res = await fetch("/api/client/employees", { cache: "no-store" });
      const data = await res.json();
      const payload = data?.data ?? data;
      const employees: Employee[] = (payload.employees || []).filter(
        (employee: Employee) => employee.employmentStatus === "ACTIVE"
      );

      setRows(
        employees.map((employee, index) => ({
          id: employee.id,
          srNo: index + 1,
          status: employee.employmentStatus,
          uanNo: employee.uanNo || "",
          esicNo: employee.esicNo || "",
          empNo: employee.empNo || "",
          employeeName: employee.fullName || "",
          department: employee.currentDept || "",
          designation: employee.designation || "",
          doj: employee.doj || "",
          bankAcNo: employee.bankAcNo || "",
          ifscCode: employee.ifscCode || "",
          bankName: employee.bankName || "",
          actualRateOfPay: toNumber(employee.salaryWage, 0),
          skillCategory: 3,
          actualWorkingDays: 0,
          otherBenefit: 0,
          tds: 0,
          loan: 0,
          adv: 0,
          tea: 0,
          lwf: 0,
        }))
      );
      setLoading(false);
    }

    async function init() {
      const canLoad = await checkLogin();
      if (!canLoad) return;
      await loadEmployees();
    }
    init();
  }, []);

  useEffect(() => {
    if (moduleEnabled !== true || rows.length === 0) return;
    applyAdvanceForPeriod(payrollMonth, payrollYear);
  }, [moduleEnabled, rows.length, payrollMonth, payrollYear]);

  function updateInput<K extends keyof PayrollInputs>(
    id: string,
    key: K,
    value: number | PayrollRow[K]
  ) {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [key]: value } : row))
    );
  }

  const computed = useMemo(
    () => rows.map((row) => ({ row, calc: calcPayroll(row) })),
    [rows]
  );
  const payrollTotals = useMemo(
    () =>
      computed.reduce(
        (acc, { row, calc }) => {
          acc.actualRateOfPay += row.actualRateOfPay;
          acc.actualWorkingDays += row.actualWorkingDays;
          acc.payDays += calc.payDaysAB;
          acc.basic += calc.basicAK;
          acc.hra += calc.hraAL;
          acc.total += calc.totalAN;
          acc.otAmount += calc.otAmountAO;
          acc.grandTotal += calc.grandTotalAP;
          acc.pf += calc.pfAQ;
          acc.esic += calc.esicAR;
          acc.profTax += calc.profTaxAS;
          acc.tds += row.tds;
          acc.loan += row.loan;
          acc.adv += row.adv;
          acc.tea += row.tea;
          acc.lwf += row.lwf;
          acc.totalDeduction += calc.totalDeductionAY;
          acc.netPayable += calc.netPayableAZ;
          acc.totalFinal += calc.totalBE;
          return acc;
        },
        {
          actualRateOfPay: 0,
          actualWorkingDays: 0,
          payDays: 0,
          basic: 0,
          hra: 0,
          total: 0,
          otAmount: 0,
          grandTotal: 0,
          pf: 0,
          esic: 0,
          profTax: 0,
          tds: 0,
          loan: 0,
          adv: 0,
          tea: 0,
          lwf: 0,
          totalDeduction: 0,
          netPayable: 0,
          totalFinal: 0,
        }
      ),
    [computed]
  );
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, index) => current - 5 + index);
  }, []);
  const selectedMonthLabel = MONTHS[payrollMonth];

  async function generatePayroll() {
    if (!computed.length) {
      setStatus("No payroll rows to export.");
      return;
    }
    setStatus("Generating payroll and saving...");

    const payloadRows = computed.map(({ row, calc }) => ({
      srNo: row.srNo,
      employeeId: row.id,
      empCode: row.empNo,
      uanNo: String(row.uanNo || ""),
      esicNo: String(row.esicNo || ""),
      employeeName: row.employeeName,
      department: row.department,
      designation: row.designation,
      doj: row.doj,
      payDays: calc.payDaysAB,
      basic: calc.basicAK,
      hra: calc.hraAL,
      total: calc.totalAN,
      otAmount: calc.otAmountAO,
      grandTotal: calc.grandTotalAP,
      pf: calc.pfAQ,
      esic: calc.esicAR,
      profTax: calc.profTaxAS,
      totalDeduction: calc.totalDeductionAY,
      netPayable: calc.netPayableAZ,
      signature: calc.signatureBA,
      bankAcNo: String(row.bankAcNo || ""),
      ifscCode: row.ifscCode,
      bankName: row.bankName,
      totalFinal: calc.totalBE,
      otHoursTarget: calc.otHoursAC,
    }));

    const res = await fetch("/api/client/payroll/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month: payrollMonth,
        year: payrollYear,
        rows: payloadRows,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setStatus(data?.message || "Failed to generate payroll.");
      return;
    }

    setStatus("Payroll generated and saved. Open Salary > Payroll Data to export.");
  }

  async function exportPayrollData() {
    const res = await fetch("/api/client/payroll/data", { cache: "no-store" });
    if (!res.ok) {
      setStatus("Failed to export payroll data.");
      return;
    }

    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const fileNameMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
    const fileName = fileNameMatch?.[1] || `payroll_data_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Payroll data exported.");
  }

  async function importPayrollData() {
    if (!importFile) {
      setStatus("Please choose a file first.");
      return;
    }

    setStatus("Importing payroll data...");
    const formData = new FormData();
    formData.append("file", importFile);

    const res = await fetch("/api/client/payroll/data", {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data?.message || "Failed to import payroll data.");
      return;
    }

    const payload = data?.data ?? data;
    const importedRows: PayrollRow[] = payload?.rows || [];
    if (importedRows.length > 0) {
      setRows(
        importedRows.map((row, index) => ({
          ...row,
          srNo: Number.isFinite(row.srNo) ? row.srNo : index + 1,
          actualRateOfPay: Number.isFinite(row.actualRateOfPay) ? row.actualRateOfPay : 0,
          skillCategory:
            row.skillCategory === 1 || row.skillCategory === 2 || row.skillCategory === 3
              ? row.skillCategory
              : 3,
          actualWorkingDays: Number.isFinite(row.actualWorkingDays) ? row.actualWorkingDays : 0,
          otherBenefit: Number.isFinite(row.otherBenefit) ? row.otherBenefit : 0,
          tds: Number.isFinite(row.tds) ? row.tds : 0,
          loan: Number.isFinite(row.loan) ? row.loan : 0,
          adv: Number.isFinite(row.adv) ? row.adv : 0,
          tea: Number.isFinite(row.tea) ? row.tea : 0,
          lwf: Number.isFinite(row.lwf) ? row.lwf : 0,
        }))
      );
    }
    setImportFile(null);
    await applyAdvanceForPeriod(payrollMonth, payrollYear);
    setStatus("Payroll data imported.");
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-slate-100">
      <ClientSidebar />

      <main className="flex-1 min-w-0 p-8">
        {moduleEnabled === false ? (
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-blue-950">Module Disabled</h2>
            <p className="mt-2 text-slate-600">Module not enabled by consultant.</p>
          </div>
        ) : (
          <>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-blue-950">Payroll Module</h1>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Payroll Month
              </label>
              <select
                value={payrollMonth}
                onChange={(e) => {
                  const nextMonth = Number(e.target.value);
                  setPayrollMonth(nextMonth);
                }}
                className="mt-1 rounded-xl border bg-white px-3 py-2 text-slate-900"
              >
                {MONTHS.map((month, index) => (
                  <option key={month} value={index}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Payroll Year
              </label>
              <select
                value={payrollYear}
                onChange={(e) => {
                  const nextYear = Number(e.target.value);
                  setPayrollYear(nextYear);
                }}
                className="mt-1 rounded-xl border bg-white px-3 py-2 text-slate-900"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={generatePayroll}
              className="rounded-2xl bg-blue-900 px-5 py-2 font-semibold text-white hover:bg-blue-800"
            >
              Generate Payroll
            </button>
          </div>
        </div>

        <p className="mt-2 text-sm font-semibold text-slate-700">
          Selected payroll period: {selectedMonthLabel} {payrollYear}
        </p>

        {status && <p className="mt-4 text-sm font-semibold text-slate-700">{status}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow">
          <button
            onClick={exportPayrollData}
            className="rounded-2xl bg-yellow-500 px-5 py-2 font-semibold text-blue-950 hover:bg-yellow-400"
          >
            Employee data
          </button>

          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            className="w-full max-w-md rounded-xl border bg-white px-4 py-2 text-slate-900"
          />

          <button
            onClick={importPayrollData}
            className="rounded-2xl bg-blue-900 px-5 py-2 font-semibold text-white hover:bg-blue-800"
          >
            Import Filled Data
          </button>
        </div>

        {loading ? (
          <p className="mt-8 text-slate-600">Loading payroll grid...</p>
        ) : (
          <div className="mt-6 max-w-full overflow-x-auto rounded-2xl border bg-white">
            <table className="min-w-[4200px] w-full text-sm text-slate-900">
              <thead>
                <tr className="bg-slate-200 text-left text-slate-700">
                  <th className="p-3">Sr#</th>
                  <th className="p-3">UAN</th>
                  <th className="p-3">ESIC</th>
                  <th className="p-3">Emp Code</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Dept</th>
                  <th className="p-3">Desig.</th>
                  <th className="p-3">DOJ</th>

                  <th className="p-3 bg-green-100">Actual Rate</th>
                  <th className="p-3 bg-green-100">Skill</th>
                  <th className="p-3 hidden">L Min Wages</th>
                  <th className="p-3 bg-yellow-100">Working Days</th>
                  <th className="p-3 hidden">N Basic 50%</th>
                  <th className="p-3 hidden">O HRA 40%</th>
                  <th className="p-3 hidden">P Payable Gross</th>
                  <th className="p-3 hidden">Q Total Payable</th>
                  <th className="p-3 hidden">R</th>
                  <th className="p-3 hidden">S OT</th>
                  <th className="p-3 hidden">T Rate Pay</th>
                  <th className="p-3 hidden">U BASIC</th>
                  <th className="p-3 hidden">V HRA</th>
                  <th className="p-3 hidden">W Attendance</th>
                  <th className="p-3 hidden">X Rate Wages</th>
                  <th className="p-3 hidden">Y Actual Payable</th>
                  <th className="p-3 hidden">Z Adjusted Days</th>
                  <th className="p-3 hidden">AA TRUNC</th>
                  <th className="p-3">Pay Days</th>
                  <th className="p-3 hidden">AC OT Hours</th>
                  <th className="p-3 hidden">AD Min Wage</th>
                  <th className="p-3 hidden">AE Min Wage</th>
                  <th className="p-3 hidden">AF ESIC</th>
                  <th className="p-3 hidden">AG Basic Rate</th>
                  <th className="p-3 hidden">AH HRA Rate</th>
                  <th className="p-3 hidden">AI PF App</th>
                  <th className="p-3 hidden">AJ ESIC App</th>
                  <th className="p-3">Basic</th>
                  <th className="p-3">HRA</th>
                  <th className="p-3 bg-yellow-100">Other Benefit</th>
                  <th className="p-3">TOTAL</th>
                  <th className="p-3">OT Amount</th>
                  <th className="p-3">GRAND TOTAL</th>
                  <th className="p-3">PF</th>
                  <th className="p-3">ESIC</th>
                  <th className="p-3">Prof Tax</th>
                  <th className="p-3 bg-yellow-100">TDS</th>
                  <th className="p-3 bg-yellow-100">Loan</th>
                  <th className="p-3 bg-yellow-100">Adv</th>
                  <th className="p-3 bg-yellow-100">Tea</th>
                  <th className="p-3 bg-yellow-100">LWF</th>
                  <th className="p-3">Total Deduction</th>
                  <th className="p-3">Net Payable</th>
                  <th className="p-3">Signature</th>
                  <th className="p-3">A/C</th>
                  <th className="p-3">IFSC</th>
                  <th className="p-3">Bank</th>
                  <th className="p-3">TOTAL</th>
                </tr>
              </thead>

              <tbody>
                {computed.map(({ row, calc }) => (
                  <tr key={row.id} className="border-t">
                    <td className="p-3">{row.srNo}</td>
                    <td className="p-3">{row.uanNo || "-"}</td>
                    <td className="p-3">{row.esicNo || "-"}</td>
                    <td className="p-3">{row.empNo || "-"}</td>
                    <td className="p-3">{row.status || "-"}</td>
                    <td className="p-3">{row.employeeName || "-"}</td>
                    <td className="p-3">{row.department || "-"}</td>
                    <td className="p-3">{row.designation || "-"}</td>
                    <td className="p-3">{row.doj || "-"}</td>

                    <td className="p-2 bg-green-50">
                      <input
                        type="number"
                        className="w-24 rounded border px-2 py-1 text-slate-900"
                        value={row.actualRateOfPay}
                        onChange={(e) =>
                          updateInput(row.id, "actualRateOfPay", Number(e.target.value) || 0)
                        }
                      />
                    </td>
                    <td className="p-2 bg-green-50">
                      <select
                        className="w-20 rounded border px-2 py-1 text-slate-900"
                        value={row.skillCategory}
                        onChange={(e) =>
                          updateInput(
                            row.id,
                            "skillCategory",
                            Number(e.target.value) as 1 | 2 | 3
                          )
                        }
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                      </select>
                    </td>
                    <td className="p-3 hidden">{money(calc.minimumWagesL)}</td>
                    <td className="p-2 bg-yellow-50">
                      <input
                        type="number"
                        step="0.5"
                        className="w-24 rounded border px-2 py-1 text-slate-900"
                        value={row.actualWorkingDays}
                        onChange={(e) =>
                          updateInput(row.id, "actualWorkingDays", Number(e.target.value) || 0)
                        }
                      />
                    </td>
                    <td className="p-3 hidden">{money(calc.basic50N)}</td>
                    <td className="p-3 hidden">{money(calc.hra40O)}</td>
                    <td className="p-3 hidden">{money(calc.actualPayableGrossP)}</td>
                    <td className="p-3 hidden">{money(calc.totalPayableAmountQ)}</td>
                    <td className="p-3 hidden">{money(calc.divisorR)}</td>
                    <td className="p-3 hidden">{money(calc.otS)}</td>
                    <td className="p-3 hidden">{money(calc.rateOfPayT)}</td>
                    <td className="p-3 hidden">{money(calc.basicU)}</td>
                    <td className="p-3 hidden">{money(calc.hraV)}</td>
                    <td className="p-3 hidden">{calc.actualAttendanceW.toFixed(2)}</td>
                    <td className="p-3 hidden">{money(calc.rateOfWagesX)}</td>
                    <td className="p-3 hidden">{money(calc.actualPayableY)}</td>
                    <td className="p-3 hidden">{calc.adjustedDaysZ.toFixed(2)}</td>
                    <td className="p-3 hidden">{calc.truncAA}</td>
                    <td className="p-3">{calc.payDaysAB}</td>
                    <td className="p-3 hidden">{calc.otHoursAC}</td>
                    <td className="p-3 hidden">{money(calc.minWageAD)}</td>
                    <td className="p-3 hidden">{money(calc.minWageAE)}</td>
                    <td className="p-3 hidden">{money(calc.esicAF)}</td>
                    <td className="p-3 hidden">{money(calc.basicRateAG)}</td>
                    <td className="p-3 hidden">{money(calc.hraRateAH)}</td>
                    <td className="p-3 hidden">{calc.pfApplicabilityAI}</td>
                    <td className="p-3 hidden">{calc.esicApplicabilityAJ}</td>
                    <td className="p-3">{money(calc.basicAK)}</td>
                    <td className="p-3">{money(calc.hraAL)}</td>

                    <td className="p-2 bg-yellow-50">
                      <input
                        type="number"
                        className="w-24 rounded border px-2 py-1 text-slate-900"
                        value={row.otherBenefit}
                        onChange={(e) =>
                          updateInput(row.id, "otherBenefit", Number(e.target.value) || 0)
                        }
                      />
                    </td>
                    <td className="p-3">{money(calc.totalAN)}</td>
                    <td className="p-3">{money(calc.otAmountAO)}</td>
                    <td className="p-3 font-semibold">{money(calc.grandTotalAP)}</td>
                    <td className="p-3">{money(calc.pfAQ)}</td>
                    <td className="p-3">{money(calc.esicAR)}</td>
                    <td className="p-3">{money(calc.profTaxAS)}</td>

                    <td className="p-2 bg-yellow-50">
                      <input
                        type="number"
                        className="w-20 rounded border px-2 py-1 text-slate-900"
                        value={row.tds}
                        onChange={(e) => updateInput(row.id, "tds", Number(e.target.value) || 0)}
                      />
                    </td>
                    <td className="p-2 bg-yellow-50">
                      <input
                        type="number"
                        className="w-20 rounded border px-2 py-1 text-slate-900"
                        value={row.loan}
                        onChange={(e) => updateInput(row.id, "loan", Number(e.target.value) || 0)}
                      />
                    </td>
                    <td className="p-2 bg-yellow-50">
                      <input
                        type="number"
                        className="w-20 rounded border px-2 py-1 text-slate-900"
                        value={row.adv}
                        onChange={(e) => updateInput(row.id, "adv", Number(e.target.value) || 0)}
                      />
                    </td>
                    <td className="p-2 bg-yellow-50">
                      <input
                        type="number"
                        className="w-20 rounded border px-2 py-1 text-slate-900"
                        value={row.tea}
                        onChange={(e) => updateInput(row.id, "tea", Number(e.target.value) || 0)}
                      />
                    </td>
                    <td className="p-2 bg-yellow-50">
                      <input
                        type="number"
                        className="w-20 rounded border px-2 py-1 text-slate-900"
                        value={row.lwf}
                        onChange={(e) => updateInput(row.id, "lwf", Number(e.target.value) || 0)}
                      />
                    </td>

                    <td className="p-3">{money(calc.totalDeductionAY)}</td>
                    <td className="p-3 font-semibold text-blue-950">{money(calc.netPayableAZ)}</td>
                    <td className="p-3">{calc.signatureBA}</td>
                    <td className="p-3">{row.bankAcNo || "-"}</td>
                    <td className="p-3">{row.ifscCode || "-"}</td>
                    <td className="p-3">{row.bankName || "-"}</td>
                    <td className="p-3">{money(calc.totalBE)}</td>
                  </tr>
                ))}
                {computed.length > 0 && (
                  <tr className="border-t-2 bg-slate-100 font-bold text-slate-900">
                    <td className="p-3" colSpan={9}>
                      Grand Total
                    </td>
                    <td className="p-3 bg-green-50">{money(payrollTotals.actualRateOfPay)}</td>
                    <td className="p-3 bg-green-50">-</td>
                    <td className="p-3 hidden">-</td>
                    <td className="p-3 bg-yellow-50">{payrollTotals.actualWorkingDays.toFixed(2)}</td>
                    <td className="p-3 hidden">-</td>
                    <td className="p-3 hidden">-</td>
                    <td className="p-3 hidden">-</td>
                    <td className="p-3 hidden">-</td>
                    <td className="p-3 hidden">-</td>
                    <td className="p-3 hidden">-</td>
                    <td className="p-3 hidden">-</td>
                    <td className="p-3 hidden">-</td>
                    <td className="p-3 hidden">-</td>
                    <td className="p-3 hidden">-</td>
                    <td className="p-3 hidden">-</td>
                    <td className="p-3 hidden">-</td>
                    <td className="p-3 hidden">-</td>
                    <td className="p-3">{payrollTotals.payDays.toFixed(2)}</td>
                    <td className="p-3 hidden">-</td>
                    <td className="p-3 hidden">-</td>
                    <td className="p-3 hidden">-</td>
                    <td className="p-3 hidden">-</td>
                    <td className="p-3 hidden">-</td>
                    <td className="p-3 hidden">-</td>
                    <td className="p-3 hidden">-</td>
                    <td className="p-3 hidden">-</td>
                    <td className="p-3">{money(payrollTotals.basic)}</td>
                    <td className="p-3">{money(payrollTotals.hra)}</td>
                    <td className="p-3 bg-yellow-50">-</td>
                    <td className="p-3">{money(payrollTotals.total)}</td>
                    <td className="p-3">{money(payrollTotals.otAmount)}</td>
                    <td className="p-3">{money(payrollTotals.grandTotal)}</td>
                    <td className="p-3">{money(payrollTotals.pf)}</td>
                    <td className="p-3">{money(payrollTotals.esic)}</td>
                    <td className="p-3">{money(payrollTotals.profTax)}</td>
                    <td className="p-3 bg-yellow-50">{money(payrollTotals.tds)}</td>
                    <td className="p-3 bg-yellow-50">{money(payrollTotals.loan)}</td>
                    <td className="p-3 bg-yellow-50">{money(payrollTotals.adv)}</td>
                    <td className="p-3 bg-yellow-50">{money(payrollTotals.tea)}</td>
                    <td className="p-3 bg-yellow-50">{money(payrollTotals.lwf)}</td>
                    <td className="p-3">{money(payrollTotals.totalDeduction)}</td>
                    <td className="p-3 text-blue-950">{money(payrollTotals.netPayable)}</td>
                    <td className="p-3">-</td>
                    <td className="p-3">-</td>
                    <td className="p-3">-</td>
                    <td className="p-3">-</td>
                    <td className="p-3">{money(payrollTotals.totalFinal)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
          </>
        )}
      </main>
    </div>
  );
}
