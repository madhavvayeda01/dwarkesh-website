"use client";

import { useEffect, useMemo, useState } from "react";
import ClientSidebar from "@/components/ClientSidebar";
import * as XLSX from "xlsx";

type Employee = {
  id: string;
  empNo: string | null;
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

function toNumber(value: string | null | undefined, fallback = 0): number {
  if (!value) return fallback;
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

  useEffect(() => {
    async function checkLogin() {
      const res = await fetch("/api/client/me");
      const data = await res.json();
      if (!data.loggedIn) window.location.href = "/signin";
    }

    async function loadEmployees() {
      setLoading(true);
      const res = await fetch("/api/client/employees", { cache: "no-store" });
      const data = await res.json();
      const employees: Employee[] = data.employees || [];

      setRows(
        employees.map((employee, index) => ({
          id: employee.id,
          srNo: index + 1,
          uanNo: employee.uanNo || "",
          esicNo: employee.esicNo || "",
          empNo: employee.empNo || "",
          status: "",
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

    checkLogin();
    loadEmployees();
  }, []);

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

  function exportFinalExcel() {
    if (!computed.length) {
      setStatus("No payroll rows to export.");
      return;
    }

    // Final export hides helper(red) and input(yellow/green) columns.
    const headers = [
      "Sr #",
      "Emp Code",
      "UAN Number",
      "ESIC Number",
      "Name Of Employee",
      "Depart.",
      "Desig.",
      "DOJ",
      "Pay Days",
      "Basic",
      "HRA",
      "TOTAL",
      "OT Amount",
      "GRAND TOTAL",
      "PF",
      "ESIC",
      "Prof Tax",
      "Total Deduction",
      "Net Payable",
      "SIGNATURE",
      "A/C NO.",
      "IFSC CODE",
      "BANK NAME",
      "TOTAL",
    ];

    const body = computed.map(({ row, calc }) => [
      row.srNo,
      row.empNo,
      String(row.uanNo || ""),
      String(row.esicNo || ""),
      row.employeeName,
      row.department,
      row.designation,
      row.doj,
      calc.payDaysAB,
      calc.basicAK,
      calc.hraAL,
      calc.totalAN,
      calc.otAmountAO,
      calc.grandTotalAP,
      calc.pfAQ,
      calc.esicAR,
      calc.profTaxAS,
      calc.totalDeductionAY,
      calc.netPayableAZ,
      calc.signatureBA,
      String(row.bankAcNo || ""),
      row.ifscCode,
      row.bankName,
      calc.totalBE,
    ]);

    const sheetData = [headers, ...body];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Force these columns as text to preserve leading zeros in Excel.
    // C: UAN Number, D: ESIC Number, S: A/C NO.
    const textCols = ["C", "D", "S"];
    for (let r = 2; r <= sheetData.length; r++) {
      for (const col of textCols) {
        const addr = `${col}${r}`;
        const cell = ws[addr];
        if (!cell) continue;
        cell.t = "s";
        cell.v = String(cell.v ?? "");
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll Final");
    XLSX.writeFile(wb, `payroll_final_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setStatus("Final payroll Excel exported.");
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-slate-100">
      <ClientSidebar />

      <main className="flex-1 min-w-0 p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-blue-950">Payroll Module</h1>
            <p className="mt-1 text-slate-600">
              Excel formulas mapped to app grid. Green/Yellow are client inputs.
            </p>
          </div>
          <button
            onClick={exportFinalExcel}
            className="rounded-2xl bg-blue-900 px-5 py-2 font-semibold text-white hover:bg-blue-800"
          >
            Export Final Payroll (Excel)
          </button>
        </div>

        {status && <p className="mt-4 text-sm font-semibold text-slate-700">{status}</p>}

        {loading ? (
          <p className="mt-8 text-slate-600">Loading payroll grid...</p>
        ) : (
          <div className="mt-6 max-w-full overflow-x-auto rounded-2xl border bg-white">
            <table className="min-w-[4200px] w-full text-sm text-slate-900">
              <thead>
                <tr className="bg-slate-200 text-left text-slate-700">
                  <th className="p-3">A Sr#</th>
                  <th className="p-3">B UAN</th>
                  <th className="p-3">C ESIC</th>
                  <th className="p-3">D Emp Code</th>
                  <th className="p-3">E Status</th>
                  <th className="p-3">F Name</th>
                  <th className="p-3">G Dept</th>
                  <th className="p-3">H Desig.</th>
                  <th className="p-3">I DOJ</th>

                  <th className="p-3 bg-green-100">J Actual Rate</th>
                  <th className="p-3 bg-green-100">K Skill</th>
                  <th className="p-3 bg-red-100">L Min Wages</th>
                  <th className="p-3 bg-yellow-100">M Working Days</th>
                  <th className="p-3 bg-red-100">N Basic 50%</th>
                  <th className="p-3 bg-red-100">O HRA 40%</th>
                  <th className="p-3 bg-red-100">P Payable Gross</th>
                  <th className="p-3 bg-red-100">Q Total Payable</th>
                  <th className="p-3 bg-red-100">R</th>
                  <th className="p-3 bg-red-100">S OT</th>
                  <th className="p-3 bg-red-100">T Rate Pay</th>
                  <th className="p-3 bg-red-100">U BASIC</th>
                  <th className="p-3 bg-red-100">V HRA</th>
                  <th className="p-3 bg-red-100">W Attendance</th>
                  <th className="p-3 bg-red-100">X Rate Wages</th>
                  <th className="p-3 bg-red-100">Y Actual Payable</th>
                  <th className="p-3 bg-red-100">Z Adjusted Days</th>
                  <th className="p-3 bg-red-100">AA TRUNC</th>
                  <th className="p-3">AB Pay Days</th>
                  <th className="p-3 bg-red-100">AC OT Hours</th>
                  <th className="p-3 bg-red-100">AD Min Wage</th>
                  <th className="p-3 bg-red-100">AE Min Wage</th>
                  <th className="p-3 bg-red-100">AF ESIC</th>
                  <th className="p-3 bg-red-100">AG Basic Rate</th>
                  <th className="p-3 bg-red-100">AH HRA Rate</th>
                  <th className="p-3 bg-red-100">AI PF App</th>
                  <th className="p-3 bg-red-100">AJ ESIC App</th>
                  <th className="p-3">AK Basic</th>
                  <th className="p-3">AL HRA</th>
                  <th className="p-3 bg-yellow-100">AM Other Benefit</th>
                  <th className="p-3">AN TOTAL</th>
                  <th className="p-3">AO OT Amount</th>
                  <th className="p-3">AP GRAND TOTAL</th>
                  <th className="p-3">AQ PF</th>
                  <th className="p-3">AR ESIC</th>
                  <th className="p-3">AS Prof Tax</th>
                  <th className="p-3 bg-yellow-100">AT TDS</th>
                  <th className="p-3 bg-yellow-100">AU Loan</th>
                  <th className="p-3 bg-yellow-100">AV Adv</th>
                  <th className="p-3 bg-yellow-100">AW Tea</th>
                  <th className="p-3 bg-yellow-100">AX LWF</th>
                  <th className="p-3">AY Total Deduction</th>
                  <th className="p-3">AZ Net Payable</th>
                  <th className="p-3">BA Signature</th>
                  <th className="p-3">BB A/C</th>
                  <th className="p-3">BC IFSC</th>
                  <th className="p-3">BD Bank</th>
                  <th className="p-3">BE TOTAL</th>
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
                    <td className="p-3 bg-red-50">{money(calc.minimumWagesL)}</td>
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
                    <td className="p-3 bg-red-50">{money(calc.basic50N)}</td>
                    <td className="p-3 bg-red-50">{money(calc.hra40O)}</td>
                    <td className="p-3 bg-red-50">{money(calc.actualPayableGrossP)}</td>
                    <td className="p-3 bg-red-50">{money(calc.totalPayableAmountQ)}</td>
                    <td className="p-3 bg-red-50">{money(calc.divisorR)}</td>
                    <td className="p-3 bg-red-50">{money(calc.otS)}</td>
                    <td className="p-3 bg-red-50">{money(calc.rateOfPayT)}</td>
                    <td className="p-3 bg-red-50">{money(calc.basicU)}</td>
                    <td className="p-3 bg-red-50">{money(calc.hraV)}</td>
                    <td className="p-3 bg-red-50">{calc.actualAttendanceW.toFixed(2)}</td>
                    <td className="p-3 bg-red-50">{money(calc.rateOfWagesX)}</td>
                    <td className="p-3 bg-red-50">{money(calc.actualPayableY)}</td>
                    <td className="p-3 bg-red-50">{calc.adjustedDaysZ.toFixed(2)}</td>
                    <td className="p-3 bg-red-50">{calc.truncAA}</td>
                    <td className="p-3">{calc.payDaysAB}</td>
                    <td className="p-3 bg-red-50">{calc.otHoursAC}</td>
                    <td className="p-3 bg-red-50">{money(calc.minWageAD)}</td>
                    <td className="p-3 bg-red-50">{money(calc.minWageAE)}</td>
                    <td className="p-3 bg-red-50">{money(calc.esicAF)}</td>
                    <td className="p-3 bg-red-50">{money(calc.basicRateAG)}</td>
                    <td className="p-3 bg-red-50">{money(calc.hraRateAH)}</td>
                    <td className="p-3 bg-red-50">{calc.pfApplicabilityAI}</td>
                    <td className="p-3 bg-red-50">{calc.esicApplicabilityAJ}</td>
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
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
