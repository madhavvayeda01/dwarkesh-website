"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BrandedLoader from "@/components/BrandedLoader";
import ClientSidebar from "@/components/ClientSidebar";
import { calcPayrollMaster, weekdayName } from "@/lib/payroll-master";
import {
  downloadResponseBlob,
  isAndroidAppWebView,
  startAndroidGetDownload,
} from "@/lib/browser-download";
import { useClientPageAccess } from "@/lib/use-client-page-access";

type PayrollMasterRow = {
  id: string;
  srNo: number;
  uanNo: string;
  esicNo: string;
  empNo: string;
  status: string;
  employeeName: string;
  department: string;
  designation: string;
  doj: string;
  bankAcNo: string;
  ifscCode: string;
  bankName: string;
  actualRateOfPay: number;
  skillCategory: 1 | 2 | 3;
  actualWorkingDays: number;
  monthlyCapDaysY: number;
  weeklyOffDay: number;
  weeklyOffLabel: string;
  otherBenefit: number;
  tds: number;
  loan: number;
  adv: number;
  tea: number;
  lwf: number;
};

type PayrollMasterImportIssue = {
  type:
    | "missing_code"
    | "duplicate_code"
    | "unknown_code"
    | "invalid_number"
    | "invalid_skill_category";
  rowNumber: number;
  code?: string;
  field?: string;
  rawValue?: string;
  message: string;
};

type PayrollMasterImportReport = {
  fileName: string;
  parsedRows: number;
  importedRowsWithCode: number;
  uniqueCodes: number;
  matchedEmployeeCodes: number;
  unknownCodesCount: number;
  unknownCodes: string[];
  duplicateCodeRows: number;
  missingCodeRows: number;
  invalidNumberCorrections: number;
  invalidSkillCategoryCorrections: number;
  employeesWithoutImportedData: number;
  issues: PayrollMasterImportIssue[];
  issueTruncated: boolean;
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

function money(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString("en-IN") : "0";
}

function normalizeFilterValue(value: string | null | undefined): string {
  return (value || "").trim();
}

export default function ClientPayrollPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState<PayrollMasterRow[]>([]);
  const [loadingContext, setLoadingContext] = useState(true);
  const [status, setStatus] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importReport, setImportReport] = useState<PayrollMasterImportReport | null>(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [designationFilter, setDesignationFilter] = useState("ALL");
  const [weekOffFilter, setWeekOffFilter] = useState("ALL");
  const today = new Date();
  const [payrollMonth, setPayrollMonth] = useState<number>(today.getMonth());
  const [payrollYear, setPayrollYear] = useState<number>(today.getFullYear());
  const { moduleEnabled, loading: accessLoading } = useClientPageAccess({ pageKey: "payroll" });

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, index) => current - 5 + index);
  }, []);

  const resetFilters = useCallback(() => {
    setGlobalSearch("");
    setDepartmentFilter("ALL");
    setStatusFilter("ALL");
    setDesignationFilter("ALL");
    setWeekOffFilter("ALL");
  }, []);

  const loadContext = useCallback(async (month: number, year: number) => {
    setLoadingContext(true);
    setImportReport(null);
    setStatus("Loading payroll context...");
    const params = new URLSearchParams({
      month: String(month),
      year: String(year),
    });

    const res = await fetch(
      `/api/client/payroll/context?${params.toString()}`,
      { cache: "no-store" }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setRows([]);
      setWarnings([]);
      setStatus(data?.message || "Failed to load payroll context.");
      setLoadingContext(false);
      if (res.status === 401) {
        window.location.href = "/signin";
      }
      return;
    }

    const payload = data?.data ?? data;
    const nextRows = (payload?.rows || []) as PayrollMasterRow[];
    const nextWarnings = (payload?.warnings || []) as string[];
    setRows(nextRows);
    setWarnings(nextWarnings);
    resetFilters();
    setStatus(nextRows.length ? "Payroll context loaded." : "No active employees found.");
    setLoadingContext(false);
  }, [resetFilters]);

  useEffect(() => {
    if (moduleEnabled !== true || accessLoading) return;
    void loadContext(payrollMonth, payrollYear);
  }, [moduleEnabled, accessLoading, payrollMonth, payrollYear, loadContext]);

  function updateInput(
    id: string,
    key:
      | "skillCategory"
      | "actualWorkingDays"
      | "otherBenefit"
      | "tds"
      | "loan"
      | "tea"
      | "lwf",
    value: number
  ) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [key]:
                key === "skillCategory"
                  ? ((value === 1 || value === 2 || value === 3 ? value : 3) as 1 | 2 | 3)
                  : value,
            }
          : row
      )
    );
  }

  const computedAll = useMemo(
    () =>
      rows.map((row) => ({
        row,
        calc: calcPayrollMaster({
          uanNo: row.uanNo,
          esicNo: row.esicNo,
          actualRateOfPay: row.actualRateOfPay,
          skillCategory: row.skillCategory,
          actualWorkingDays: row.actualWorkingDays,
          monthlyCapDaysY: row.monthlyCapDaysY,
          otherBenefit: row.otherBenefit,
          tds: row.tds,
          loan: row.loan,
          adv: row.adv,
          tea: row.tea,
          lwf: row.lwf,
        }),
      })),
    [rows]
  );

  const filterOptions = useMemo(() => {
    const uniq = (values: string[]) =>
      Array.from(new Set(values.map((value) => normalizeFilterValue(value)).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b)
      );
    return {
      departments: uniq(rows.map((row) => row.department)),
      statuses: uniq(rows.map((row) => row.status)),
      designations: uniq(rows.map((row) => row.designation)),
      weekOffs: uniq(rows.map((row) => row.weeklyOffLabel || weekdayName(row.weeklyOffDay))),
    };
  }, [rows]);

  const computed = useMemo(() => {
    const search = globalSearch.trim().toLowerCase();
    return computedAll.filter(({ row }) => {
      const department = normalizeFilterValue(row.department);
      const status = normalizeFilterValue(row.status);
      const designation = normalizeFilterValue(row.designation);
      const weekOff = normalizeFilterValue(row.weeklyOffLabel || weekdayName(row.weeklyOffDay));

      if (departmentFilter !== "ALL" && department !== departmentFilter) return false;
      if (statusFilter !== "ALL" && status !== statusFilter) return false;
      if (designationFilter !== "ALL" && designation !== designationFilter) return false;
      if (weekOffFilter !== "ALL" && weekOff !== weekOffFilter) return false;

      if (!search) return true;
      const haystack = [
        row.empNo,
        row.employeeName,
        row.department,
        row.designation,
        row.uanNo,
        row.esicNo,
        row.status,
        row.doj,
        row.bankAcNo,
        row.ifscCode,
        row.bankName,
        weekOff,
      ]
        .map((value) => normalizeFilterValue(value))
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }, [
    computedAll,
    globalSearch,
    departmentFilter,
    statusFilter,
    designationFilter,
    weekOffFilter,
  ]);

  const payrollTotals = useMemo(
    () =>
      computed.reduce(
        (acc, { row, calc }) => {
          acc.actualRateOfPay += row.actualRateOfPay;
          acc.actualWorkingDays += row.actualWorkingDays;
          acc.payDays += calc.payDaysAC;
          acc.otherBenefit += row.otherBenefit;
          acc.basic += calc.basicAL;
          acc.hra += calc.hraAM;
          acc.total += calc.totalAO;
          acc.otAmount += calc.otAmountAP;
          acc.grandTotal += calc.grandTotalAQ;
          acc.pf += calc.pfAR;
          acc.esic += calc.esicAS;
          acc.profTax += calc.profTaxAT;
          acc.tds += calc.tdsAU;
          acc.loan += calc.loanAV;
          acc.adv += calc.advAW;
          acc.tea += calc.teaAX;
          acc.lwf += calc.lwfAY;
          acc.totalDeduction += calc.totalDeductionAZ;
          acc.netPayable += calc.netPayableBA;
          acc.totalFinal += calc.totalBF;
          return acc;
        },
        {
          actualRateOfPay: 0,
          actualWorkingDays: 0,
          payDays: 0,
          otherBenefit: 0,
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

  async function generatePayroll() {
    if (!computedAll.length) {
      setStatus("No payroll rows to generate.");
      return;
    }

    setStatus("Generating payroll and saving...");
    const payloadRows = computedAll.map(({ row, calc }) => ({
      srNo: row.srNo,
      employeeId: row.id,
      empCode: row.empNo || row.id,
      uanNo: String(row.uanNo || ""),
      esicNo: String(row.esicNo || ""),
      employeeName: row.employeeName,
      department: row.department,
      designation: row.designation,
      doj: row.doj,
      weeklyOff: row.weeklyOffLabel || weekdayName(row.weeklyOffDay),
      monthlyCapDays: row.monthlyCapDaysY,
      payDays: calc.payDaysAC,
      basic: calc.basicAL,
      hra: calc.hraAM,
      total: calc.totalAO,
      otAmount: calc.otAmountAP,
      grandTotal: calc.grandTotalAQ,
      pf: calc.pfAR,
      esic: calc.esicAS,
      profTax: calc.profTaxAT,
      tds: calc.tdsAU,
      loan: calc.loanAV,
      adv: calc.advAW,
      tea: calc.teaAX,
      lwf: calc.lwfAY,
      totalDeduction: calc.totalDeductionAZ,
      netPayable: calc.netPayableBA,
      signature: calc.signatureBB,
      bankAcNo: String(row.bankAcNo || ""),
      ifscCode: row.ifscCode || "",
      bankName: row.bankName || "",
      totalFinal: calc.totalBF,
      otHoursTarget: calc.otHoursAD,
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
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data?.message || "Failed to generate payroll.");
      return;
    }

    setStatus("Payroll generated and saved. Open Salary > Payroll Data to export.");
  }

  async function exportPayrollData() {
    if (isAndroidAppWebView()) {
      startAndroidGetDownload(
        `/api/client/payroll/data?month=${payrollMonth}&year=${payrollYear}`,
        (message) => setStatus(message)
      );
      setStatus("Payroll data export started.");
      return;
    }

    const res = await fetch(
      `/api/client/payroll/data?month=${payrollMonth}&year=${payrollYear}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      setStatus("Failed to export payroll data.");
      return;
    }

    await downloadResponseBlob(
      res,
      `payroll_data_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    setStatus("Payroll data exported.");
  }

  async function importPayrollData() {
    if (!importFile) {
      setStatus("Please choose a file first.");
      return;
    }

    setStatus("Importing payroll data...");
    setImportReport(null);
    const formData = new FormData();
    formData.append("file", importFile);

    const res = await fetch(`/api/client/payroll/data?month=${payrollMonth}&year=${payrollYear}`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data?.message || "Failed to import payroll data.");
      return;
    }

    const payload = data?.data ?? data;
    const importedRows: PayrollMasterRow[] = payload?.rows || [];
    const report: PayrollMasterImportReport | null = payload?.report || null;
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
          monthlyCapDaysY: Number.isFinite(row.monthlyCapDaysY) ? row.monthlyCapDaysY : 0,
          weeklyOffDay: Number.isFinite(row.weeklyOffDay) ? row.weeklyOffDay : 0,
          otherBenefit: Number.isFinite(row.otherBenefit) ? row.otherBenefit : 0,
          tds: Number.isFinite(row.tds) ? row.tds : 0,
          loan: Number.isFinite(row.loan) ? row.loan : 0,
          adv: Number.isFinite(row.adv) ? row.adv : 0,
          tea: Number.isFinite(row.tea) ? row.tea : 0,
          lwf: Number.isFinite(row.lwf) ? row.lwf : 0,
        }))
      );
    }
    setImportReport(report);
    setImportFile(null);
    if (report) {
      setStatus(
        `Payroll data imported. Matched ${report.matchedEmployeeCodes}/${report.uniqueCodes} codes, unknown: ${report.unknownCodesCount}, corrected values: ${report.invalidNumberCorrections + report.invalidSkillCategoryCorrections}.`
      );
    } else {
      setStatus("Payroll data imported.");
    }
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-slate-100 dark:bg-slate-950">
      <ClientSidebar />

      <main className="flex-1 min-w-0 p-8 text-slate-900 dark:text-slate-100">
        {moduleEnabled === false ? (
          <div className="rounded-2xl bg-white p-6 shadow dark:bg-slate-900">
            <h2 className="text-xl font-bold text-blue-950 dark:text-white">Page Disabled</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300">This page is not enabled by consultant.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-blue-950 dark:text-white">Payroll Module</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Excel-matched payroll logic with monthly cap days and live payroll record save.
                </p>
                {(importFile || status) && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {importFile && (
                      <span className="rounded-full border border-slate-300 bg-white px-3 py-1 dark:border-slate-600 dark:bg-slate-800">
                        File: {importFile.name}
                      </span>
                    )}
                    {status && <span>{status}</span>}
                  </div>
                )}
                {warnings.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-xs text-amber-700 dark:text-amber-300">
                    {warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:items-end">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-2xl border border-slate-300 bg-white px-5 py-2 font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    {importFile ? "Change File" : "Choose File"}
                  </button>

                  <button
                    type="button"
                    onClick={importPayrollData}
                    disabled={!importFile}
                    className="rounded-2xl bg-blue-900 px-5 py-2 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
                  >
                    Import Data
                  </button>

                  <button
                    type="button"
                    onClick={exportPayrollData}
                    className="rounded-2xl bg-yellow-500 px-5 py-2 font-semibold text-blue-950 hover:bg-yellow-400"
                  >
                    Export Data
                  </button>
                </div>

                <div className="flex flex-wrap items-end gap-3 sm:justify-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">Payroll Month</label>
                    <select
                      value={payrollMonth}
                      onChange={(e) => setPayrollMonth(Number(e.target.value))}
                      className="mt-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {MONTHS.map((month, index) => (
                        <option key={month} value={index}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">Payroll Year</label>
                    <select
                      value={payrollYear}
                      onChange={(e) => setPayrollYear(Number(e.target.value))}
                      className="mt-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => void loadContext(payrollMonth, payrollYear)}
                    className="rounded-2xl border border-slate-300 bg-white px-5 py-2 font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={generatePayroll}
                    className="rounded-2xl bg-blue-900 px-5 py-2 font-semibold text-white hover:bg-blue-800"
                  >
                    Generate Payroll
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-blue-950 dark:text-slate-100">
                  Payroll Filters ({computed.length}
                  {computed.length !== rows.length ? ` / ${rows.length}` : ""})
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    placeholder="Search all payroll fields..."
                    className="w-full min-w-[220px] max-w-[360px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />

                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="ALL">Department: All</option>
                    {filterOptions.departments.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="ALL">Status: All</option>
                    {filterOptions.statuses.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>

                  <select
                    value={designationFilter}
                    onChange={(e) => setDesignationFilter(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="ALL">Designation: All</option>
                    {filterOptions.designations.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>

                  <select
                    value={weekOffFilter}
                    onChange={(e) => setWeekOffFilter(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="ALL">Week Off: All</option>
                    {filterOptions.weekOffs.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Filters affect table view and totals only. Generate/Export use the full loaded payroll dataset.
              </p>
            </div>

            {importReport && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="text-sm font-bold text-blue-950 dark:text-slate-100">Import Report</h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">File: {importReport.fileName}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-200 md:grid-cols-4">
                  <div>Parsed Rows: <span className="font-semibold">{importReport.parsedRows}</span></div>
                  <div>Rows With Code: <span className="font-semibold">{importReport.importedRowsWithCode}</span></div>
                  <div>Unique Codes: <span className="font-semibold">{importReport.uniqueCodes}</span></div>
                  <div>Matched Codes: <span className="font-semibold">{importReport.matchedEmployeeCodes}</span></div>
                  <div>Unknown Codes: <span className="font-semibold">{importReport.unknownCodesCount}</span></div>
                  <div>Missing Code Rows: <span className="font-semibold">{importReport.missingCodeRows}</span></div>
                  <div>Duplicate Code Rows: <span className="font-semibold">{importReport.duplicateCodeRows}</span></div>
                  <div>
                    Corrected Values:{" "}
                    <span className="font-semibold">
                      {importReport.invalidNumberCorrections + importReport.invalidSkillCategoryCorrections}
                    </span>
                  </div>
                  <div>Invalid Numbers: <span className="font-semibold">{importReport.invalidNumberCorrections}</span></div>
                  <div>Invalid Skill: <span className="font-semibold">{importReport.invalidSkillCategoryCorrections}</span></div>
                  <div>
                    Employees Without Imported Data:{" "}
                    <span className="font-semibold">{importReport.employeesWithoutImportedData}</span>
                  </div>
                </div>

                {importReport.unknownCodes.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      Unknown Employee Codes (not in active employee master):
                    </p>
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{importReport.unknownCodes.join(", ")}</p>
                  </div>
                )}

                {importReport.issues.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Issue Details</p>
                    <div className="mt-1 max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {importReport.issues.map((issue, index) => (
                        <p key={`${issue.type}-${issue.rowNumber}-${issue.code || ""}-${index}`}>
                          Row {issue.rowNumber > 0 ? issue.rowNumber : "-"}
                          {issue.code ? ` | Code: ${issue.code}` : ""}
                          {issue.field ? ` | Field: ${issue.field}` : ""}: {issue.message}
                          {issue.rawValue ? ` (Raw: ${issue.rawValue})` : ""}
                        </p>
                      ))}
                      {importReport.issueTruncated && (
                        <p className="mt-1 font-semibold text-slate-600 dark:text-slate-300">
                          More issues exist. Showing first {importReport.issues.length} entries.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {accessLoading || loadingContext ? (
              <div className="mt-6">
                <BrandedLoader
                  compact
                  title="Loading payroll"
                  subtitle="Resolving client session, monthly rows, weekly off, and payroll context."
                />
              </div>
            ) : (
              <div className="mt-6 max-w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <table className="min-w-[3600px] w-full text-sm text-slate-900 dark:text-slate-100">
                  <thead>
                    <tr className="bg-slate-200 text-left text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <th className="p-3">Sr#</th>
                      <th className="p-3">UAN</th>
                      <th className="p-3">ESIC</th>
                      <th className="p-3">Emp Code</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Dept</th>
                      <th className="p-3">Desig.</th>
                      <th className="p-3">DOJ</th>
                      <th className="p-3 bg-green-100 dark:bg-emerald-900/45 dark:text-emerald-100">Actual Rate</th>
                      <th className="p-3 bg-blue-100 dark:bg-sky-900/45 dark:text-sky-100">Skill</th>
                      <th className="p-3 bg-blue-100 dark:bg-sky-900/45 dark:text-sky-100">Working Days</th>
                      <th className="p-3 bg-green-100 dark:bg-emerald-900/45 dark:text-emerald-100">Week Off</th>
                      <th className="p-3 bg-green-100 dark:bg-emerald-900/45 dark:text-emerald-100">Cap Days (Y)</th>
                      <th className="p-3">Pay Days</th>
                      <th className="p-3 bg-blue-100 dark:bg-sky-900/45 dark:text-sky-100">Other Benefit</th>
                      <th className="p-3">Basic</th>
                      <th className="p-3">HRA</th>
                      <th className="p-3">TOTAL</th>
                      <th className="p-3">OT Amount</th>
                      <th className="p-3">GRAND TOTAL</th>
                      <th className="p-3">PF</th>
                      <th className="p-3">ESIC</th>
                      <th className="p-3">Prof Tax</th>
                      <th className="p-3 bg-blue-100 dark:bg-sky-900/45 dark:text-sky-100">TDS</th>
                      <th className="p-3 bg-blue-100 dark:bg-sky-900/45 dark:text-sky-100">Loan</th>
                      <th className="p-3 bg-green-100 dark:bg-emerald-900/45 dark:text-emerald-100">Adv</th>
                      <th className="p-3 bg-blue-100 dark:bg-sky-900/45 dark:text-sky-100">Tea</th>
                      <th className="p-3 bg-blue-100 dark:bg-sky-900/45 dark:text-sky-100">LWF</th>
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
                      <tr key={row.id} className="border-t border-slate-200 dark:border-slate-700">
                        <td className="p-3">{row.srNo}</td>
                        <td className="p-3">{row.uanNo || "-"}</td>
                        <td className="p-3">{row.esicNo || "-"}</td>
                        <td className="p-3">{row.empNo || "-"}</td>
                        <td className="p-3">{row.employeeName || "-"}</td>
                        <td className="p-3">{row.department || "-"}</td>
                        <td className="p-3">{row.designation || "-"}</td>
                        <td className="p-3">{row.doj || "-"}</td>
                        <td className="p-3 bg-green-50 text-slate-900 dark:bg-emerald-900/25 dark:text-emerald-100">{money(row.actualRateOfPay)}</td>
                        <td className="p-2 bg-blue-50 dark:bg-sky-900/25">
                          <select
                            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            value={row.skillCategory}
                            onChange={(e) =>
                              updateInput(row.id, "skillCategory", Number(e.target.value) || 3)
                            }
                          >
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                          </select>
                        </td>
                        <td className="p-2 bg-blue-50 dark:bg-sky-900/25">
                          <input
                            type="number"
                            step="0.5"
                            className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            value={row.actualWorkingDays}
                            onChange={(e) =>
                              updateInput(row.id, "actualWorkingDays", Number(e.target.value) || 0)
                            }
                          />
                        </td>
                        <td className="p-3 bg-green-50 text-slate-900 dark:bg-emerald-900/25 dark:text-emerald-100">{row.weeklyOffLabel || weekdayName(row.weeklyOffDay)}</td>
                        <td className="p-3 bg-green-50 text-slate-900 dark:bg-emerald-900/25 dark:text-emerald-100">{row.monthlyCapDaysY}</td>
                        <td className="p-3">{calc.payDaysAC}</td>
                        <td className="p-2 bg-blue-50 dark:bg-sky-900/25">
                          <input
                            type="number"
                            className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            value={row.otherBenefit}
                            onChange={(e) =>
                              updateInput(row.id, "otherBenefit", Number(e.target.value) || 0)
                            }
                          />
                        </td>
                        <td className="p-3">{money(calc.basicAL)}</td>
                        <td className="p-3">{money(calc.hraAM)}</td>
                        <td className="p-3">{money(calc.totalAO)}</td>
                        <td className="p-3">{money(calc.otAmountAP)}</td>
                        <td className="p-3 font-semibold">{money(calc.grandTotalAQ)}</td>
                        <td className="p-3">{money(calc.pfAR)}</td>
                        <td className="p-3">{money(calc.esicAS)}</td>
                        <td className="p-3">{money(calc.profTaxAT)}</td>
                        <td className="p-2 bg-blue-50 dark:bg-sky-900/25">
                          <input
                            type="number"
                            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            value={row.tds}
                            onChange={(e) => updateInput(row.id, "tds", Number(e.target.value) || 0)}
                          />
                        </td>
                        <td className="p-2 bg-blue-50 dark:bg-sky-900/25">
                          <input
                            type="number"
                            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            value={row.loan}
                            onChange={(e) => updateInput(row.id, "loan", Number(e.target.value) || 0)}
                          />
                        </td>
                        <td className="p-3 bg-green-50 text-slate-900 dark:bg-emerald-900/25 dark:text-emerald-100">{money(row.adv)}</td>
                        <td className="p-2 bg-blue-50 dark:bg-sky-900/25">
                          <input
                            type="number"
                            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            value={row.tea}
                            onChange={(e) => updateInput(row.id, "tea", Number(e.target.value) || 0)}
                          />
                        </td>
                        <td className="p-2 bg-blue-50 dark:bg-sky-900/25">
                          <input
                            type="number"
                            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            value={row.lwf}
                            onChange={(e) => updateInput(row.id, "lwf", Number(e.target.value) || 0)}
                          />
                        </td>
                        <td className="p-3">{money(calc.totalDeductionAZ)}</td>
                        <td className="p-3 font-semibold text-blue-950 dark:text-blue-200">{money(calc.netPayableBA)}</td>
                        <td className="p-3">{calc.signatureBB}</td>
                        <td className="p-3">{row.bankAcNo || "-"}</td>
                        <td className="p-3">{row.ifscCode || "-"}</td>
                        <td className="p-3">{row.bankName || "-"}</td>
                        <td className="p-3">{money(calc.totalBF)}</td>
                      </tr>
                    ))}

                    {computed.length === 0 && (
                      <tr className="border-t border-slate-200 dark:border-slate-700">
                        <td colSpan={35} className="p-4 text-center text-slate-600 dark:text-slate-300">
                          No payroll rows match current filters.
                        </td>
                      </tr>
                    )}

                    {computed.length > 0 && (
                      <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                        <td className="p-3" colSpan={8}>
                          Grand Total
                        </td>
                        <td className="p-3 bg-green-50 text-slate-900 dark:bg-emerald-900/25 dark:text-emerald-100">{money(payrollTotals.actualRateOfPay)}</td>
                        <td className="p-3 bg-blue-50 dark:bg-sky-900/25">-</td>
                        <td className="p-3 bg-blue-50 dark:bg-sky-900/25">{payrollTotals.actualWorkingDays.toFixed(2)}</td>
                        <td className="p-3 bg-green-50 dark:bg-emerald-900/25">-</td>
                        <td className="p-3 bg-green-50 dark:bg-emerald-900/25">-</td>
                        <td className="p-3">{payrollTotals.payDays.toFixed(2)}</td>
                        <td className="p-3 bg-blue-50 dark:bg-sky-900/25">{money(payrollTotals.otherBenefit)}</td>
                        <td className="p-3">{money(payrollTotals.basic)}</td>
                        <td className="p-3">{money(payrollTotals.hra)}</td>
                        <td className="p-3">{money(payrollTotals.total)}</td>
                        <td className="p-3">{money(payrollTotals.otAmount)}</td>
                        <td className="p-3">{money(payrollTotals.grandTotal)}</td>
                        <td className="p-3">{money(payrollTotals.pf)}</td>
                        <td className="p-3">{money(payrollTotals.esic)}</td>
                        <td className="p-3">{money(payrollTotals.profTax)}</td>
                        <td className="p-3 bg-blue-50 dark:bg-sky-900/25">{money(payrollTotals.tds)}</td>
                        <td className="p-3 bg-blue-50 dark:bg-sky-900/25">{money(payrollTotals.loan)}</td>
                        <td className="p-3 bg-green-50 text-slate-900 dark:bg-emerald-900/25 dark:text-emerald-100">{money(payrollTotals.adv)}</td>
                        <td className="p-3 bg-blue-50 dark:bg-sky-900/25">{money(payrollTotals.tea)}</td>
                        <td className="p-3 bg-blue-50 dark:bg-sky-900/25">{money(payrollTotals.lwf)}</td>
                        <td className="p-3">{money(payrollTotals.totalDeduction)}</td>
                        <td className="p-3 text-blue-950 dark:text-blue-200">{money(payrollTotals.netPayable)}</td>
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
