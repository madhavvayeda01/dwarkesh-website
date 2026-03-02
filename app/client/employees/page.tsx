"use client";

import { useEffect, useMemo, useState } from "react";
import ClientSidebar from "@/components/ClientSidebar";

type Employee = {
  id: string;

  empNo: string | null;
  fileNo: string | null;
  pfNo: string | null;
  uanNo: string | null;
  esicNo: string | null;

  firstName: string | null;
  surName: string | null;
  fatherSpouseName: string | null;
  fullName: string | null;
  employmentStatus: "ACTIVE" | "INACTIVE";

  designation: string | null;
  currentDept: string | null;
  salaryWage: string | null;

  dob: string | null;
  doj: string | null;
  dor: string | null;
  reasonForExit: string | null;

  panNo: string | null;
  aadharNo: string | null;
  elcIdNo: string | null;
  drivingLicenceNo: string | null;

  bankAcNo: string | null;
  ifscCode: string | null;
  bankName: string | null;

  mobileNumber: string | null;
  gender: string | null;
  religion: string | null;
  nationality: string | null;
  typeOfEmployment: string | null;
  maritalStatus: string | null;
  educationQualification: string | null;
  experienceInRelevantField: string | null;

  presentAddress: string | null;
  permanentAddress: string | null;
  village: string | null;
  thana: string | null;
  subDivision: string | null;
  postOffice: string | null;
  district: string | null;
  state: string | null;
  pinCode: string | null;
  temporaryAddress: string | null;

  nominee1Name: string | null;
  nominee1Relation: string | null;
  nominee1BirthDate: string | null;
  nominee1Age: string | null;
  nominee1Proportion: string | null;

  nominee2Name: string | null;
  nominee2Relation: string | null;
  nominee2BirthDate: string | null;
  nominee2Age: string | null;
  nominee2Proportion: string | null;

  createdAt: string;
};

type FilterableEmployeeField = Exclude<keyof Employee, "id" | "createdAt">;

type EmployeeColumn = {
  key: FilterableEmployeeField;
  label: string;
};

const EMPLOYEE_COLUMNS: EmployeeColumn[] = [
  { key: "empNo", label: "Emp No" },
  { key: "fileNo", label: "File No" },
  { key: "pfNo", label: "PF No" },
  { key: "uanNo", label: "UAN No" },
  { key: "esicNo", label: "ESIC No" },
  { key: "firstName", label: "First Name" },
  { key: "surName", label: "Sur Name" },
  { key: "fatherSpouseName", label: "Father/Spouse" },
  { key: "fullName", label: "Full Name" },
  { key: "employmentStatus", label: "Status" },
  { key: "designation", label: "Designation" },
  { key: "currentDept", label: "Dept" },
  { key: "salaryWage", label: "Salary/Wage" },
  { key: "dob", label: "DOB" },
  { key: "doj", label: "DOJ" },
  { key: "dor", label: "DOR" },
  { key: "reasonForExit", label: "Exit Reason" },
  { key: "panNo", label: "PAN" },
  { key: "aadharNo", label: "Aadhar" },
  { key: "elcIdNo", label: "ELC ID" },
  { key: "drivingLicenceNo", label: "DL No" },
  { key: "bankAcNo", label: "Bank A/c" },
  { key: "ifscCode", label: "IFSC" },
  { key: "bankName", label: "Bank Name" },
  { key: "mobileNumber", label: "Mobile" },
  { key: "gender", label: "Gender" },
  { key: "religion", label: "Religion" },
  { key: "nationality", label: "Nationality" },
  { key: "typeOfEmployment", label: "Employment Type" },
  { key: "maritalStatus", label: "Marital" },
  { key: "educationQualification", label: "Education" },
  { key: "experienceInRelevantField", label: "Experience" },
  { key: "presentAddress", label: "Present Add." },
  { key: "permanentAddress", label: "Permanent Add." },
  { key: "village", label: "Village" },
  { key: "thana", label: "Thana" },
  { key: "subDivision", label: "Sub-Div" },
  { key: "postOffice", label: "Post Office" },
  { key: "district", label: "District" },
  { key: "state", label: "State" },
  { key: "pinCode", label: "Pin" },
  { key: "temporaryAddress", label: "Temporary Add." },
  { key: "nominee1Name", label: "Nominee1" },
  { key: "nominee1Relation", label: "Relation1" },
  { key: "nominee1BirthDate", label: "DOB1" },
  { key: "nominee1Age", label: "Age1" },
  { key: "nominee1Proportion", label: "Share1" },
  { key: "nominee2Name", label: "Nominee2" },
  { key: "nominee2Relation", label: "Relation2" },
  { key: "nominee2BirthDate", label: "DOB2" },
  { key: "nominee2Age", label: "Age2" },
  { key: "nominee2Proportion", label: "Share2" },
];

const CATEGORICAL_FILTER_FIELDS: FilterableEmployeeField[] = [
  "currentDept",
  "employmentStatus",
  "designation",
  "gender",
  "maritalStatus",
  "religion",
  "nationality",
  "state",
];

const INITIAL_CATEGORICAL_FILTERS: Record<FilterableEmployeeField, string> = {
  empNo: "ALL",
  fileNo: "ALL",
  pfNo: "ALL",
  uanNo: "ALL",
  esicNo: "ALL",
  firstName: "ALL",
  surName: "ALL",
  fatherSpouseName: "ALL",
  fullName: "ALL",
  employmentStatus: "ALL",
  designation: "ALL",
  currentDept: "ALL",
  salaryWage: "ALL",
  dob: "ALL",
  doj: "ALL",
  dor: "ALL",
  reasonForExit: "ALL",
  panNo: "ALL",
  aadharNo: "ALL",
  elcIdNo: "ALL",
  drivingLicenceNo: "ALL",
  bankAcNo: "ALL",
  ifscCode: "ALL",
  bankName: "ALL",
  mobileNumber: "ALL",
  gender: "ALL",
  religion: "ALL",
  nationality: "ALL",
  typeOfEmployment: "ALL",
  maritalStatus: "ALL",
  educationQualification: "ALL",
  experienceInRelevantField: "ALL",
  presentAddress: "ALL",
  permanentAddress: "ALL",
  village: "ALL",
  thana: "ALL",
  subDivision: "ALL",
  postOffice: "ALL",
  district: "ALL",
  state: "ALL",
  pinCode: "ALL",
  temporaryAddress: "ALL",
  nominee1Name: "ALL",
  nominee1Relation: "ALL",
  nominee1BirthDate: "ALL",
  nominee1Age: "ALL",
  nominee1Proportion: "ALL",
  nominee2Name: "ALL",
  nominee2Relation: "ALL",
  nominee2BirthDate: "ALL",
  nominee2Age: "ALL",
  nominee2Proportion: "ALL",
};

const CRITICAL_FIELD_OPTIONS: Array<{ key: FilterableEmployeeField; label: string }> = [
  { key: "empNo", label: "Emp No" },
  { key: "fullName", label: "Full Name" },
  { key: "designation", label: "Designation" },
  { key: "currentDept", label: "Department" },
  { key: "doj", label: "DOJ" },
  { key: "mobileNumber", label: "Mobile" },
];

const DEFAULT_CRITICAL_FIELDS: Record<FilterableEmployeeField, boolean> = {
  empNo: true,
  fileNo: false,
  pfNo: false,
  uanNo: false,
  esicNo: false,
  firstName: false,
  surName: false,
  fatherSpouseName: false,
  fullName: true,
  employmentStatus: false,
  designation: true,
  currentDept: true,
  salaryWage: false,
  dob: false,
  doj: true,
  dor: false,
  reasonForExit: false,
  panNo: false,
  aadharNo: false,
  elcIdNo: false,
  drivingLicenceNo: false,
  bankAcNo: false,
  ifscCode: false,
  bankName: false,
  mobileNumber: true,
  gender: false,
  religion: false,
  nationality: false,
  typeOfEmployment: false,
  maritalStatus: false,
  educationQualification: false,
  experienceInRelevantField: false,
  presentAddress: false,
  permanentAddress: false,
  village: false,
  thana: false,
  subDivision: false,
  postOffice: false,
  district: false,
  state: false,
  pinCode: false,
  temporaryAddress: false,
  nominee1Name: false,
  nominee1Relation: false,
  nominee1BirthDate: false,
  nominee1Age: false,
  nominee1Proportion: false,
  nominee2Name: false,
  nominee2Relation: false,
  nominee2BirthDate: false,
  nominee2Age: false,
  nominee2Proportion: false,
};

type GapMode = "full" | "prefix";

type CodeParts = {
  prefix: string;
  number: number;
  width: number;
  raw: string;
};

type GapItem = {
  scope: string;
  missingCode: string;
};

type DuplicateCodeGroup = {
  code: string;
  rows: Array<{ id: string; name: string; empNo: string }>;
};

type IdentityDuplicateGroup = {
  fieldLabel: string;
  value: string;
  rows: Array<{ id: string; empNo: string; name: string }>;
};

type SimilarNamePair = {
  left: { id: string; name: string; fatherSpouseName: string; empNo: string };
  right: { id: string; name: string; fatherSpouseName: string; empNo: string };
  distance: number;
};

type FieldConflictGroup = {
  fieldLabel: string;
  value: string;
  names: string[];
  rows: Array<{ id: string; name: string; empNo: string }>;
};

type MissingCriticalRow = {
  id: string;
  empNo: string;
  name: string;
  missingFields: string[];
};

type FormatErrorItem = {
  id: string;
  empNo: string;
  name: string;
  fieldLabel: string;
  value: string;
  expected: string;
};

type DateLogicItem = {
  id: string;
  empNo: string;
  name: string;
  issue: string;
};

function toCompactText(value: string | null): string {
  return (value || "").trim();
}

function normalizeAlphaNumeric(value: string | null): string {
  return toCompactText(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normalizeDigits(value: string | null): string {
  return toCompactText(value).replace(/\D/g, "");
}

function normalizeName(value: string | null): string {
  return toCompactText(value)
    .toUpperCase()
    .replace(/[^A-Z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseEmployeeCode(value: string | null): CodeParts | null {
  const raw = toCompactText(value);
  if (!raw) return null;
  const match = raw.match(/^([^0-9]*)(\d+)$/);
  if (!match) return null;
  const number = Number.parseInt(match[2], 10);
  if (!Number.isFinite(number)) return null;
  return {
    prefix: match[1].toUpperCase(),
    number,
    width: match[2].length,
    raw,
  };
}

function formatEmployeeCode(prefix: string, number: number, width: number): string {
  const numberText = String(number).padStart(width, "0");
  return `${prefix}${numberText}`;
}

function levenshteinDistance(a: string, b: string): number {
  const n = a.length;
  const m = b.length;
  if (n === 0) return m;
  if (m === 0) return n;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 0; i <= n; i += 1) dp[i][0] = i;
  for (let j = 0; j <= m; j += 1) dp[0][j] = j;
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[n][m];
}

function parseLooseDate(value: string | null): Date | null {
  const text = toCompactText(value);
  if (!text) return null;

  const direct = new Date(text);
  if (!Number.isNaN(direct.getTime())) return direct;

  const dmy = text.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmy) {
    const day = Number.parseInt(dmy[1], 10);
    const month = Number.parseInt(dmy[2], 10);
    const year = Number.parseInt(dmy[3], 10);
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return parsed;
    }
  }

  return null;
}

export default function ClientEmployeesPage() {
  // 🔐 Client login check
  useEffect(() => {
    async function checkLogin() {
      const res = await fetch("/api/client/me");
      const data = await res.json();
      const loggedIn = data?.data?.loggedIn ?? data?.loggedIn ?? false;
      if (!loggedIn) window.location.href = "/signin";
    }
    checkLogin();
  }, []);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingAll, setDeletingAll] = useState(false);
  const [msg, setMsg] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [moduleEnabled, setModuleEnabled] = useState<boolean | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [savingRow, setSavingRow] = useState(false);
  const [editDraft, setEditDraft] = useState<Partial<Record<FilterableEmployeeField, string>>>({});
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [empSortOrder, setEmpSortOrder] = useState<"none" | "asc" | "desc">("none");
  const [globalSearch, setGlobalSearch] = useState("");
  const [columnSearch, setColumnSearch] = useState<Partial<Record<FilterableEmployeeField, string>>>({});
  const [categoricalFilters, setCategoricalFilters] = useState(INITIAL_CATEGORICAL_FILTERS);
  const [checkerOpen, setCheckerOpen] = useState(false);
  const [gapMode, setGapMode] = useState<GapMode>("full");
  const [criticalFields, setCriticalFields] = useState(DEFAULT_CRITICAL_FIELDS);

  function formatUanNo(value: string | null): string {
    if (!value) return "-";
    const compact = value.trim().replace(/[\s,]/g, "");
    if (!compact) return "-";

    const numeric = Number(compact);
    if (Number.isFinite(numeric)) {
      const plain = numeric.toLocaleString("fullwide", { useGrouping: false });
      const digits = plain.replace(/\D/g, "");
      return digits || "-";
    }

    const digits = compact.replace(/\D/g, "");
    return digits || "-";
  }

  function normalizeHashOnlyValues(list: Employee[]): Employee[] {
    return list.map((employee) => {
      const entries = Object.entries(employee).map(([key, value]) => {
        if (typeof value !== "string") return [key, value];
        const trimmed = value.trim();
        if (/^#+$/.test(trimmed)) return [key, null];
        return [key, value];
      });

      return Object.fromEntries(entries) as Employee;
    });
  }

  async function fetchEmployees() {
    setLoading(true);
    const res = await fetch("/api/client/employees", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = data?.message || "Failed to load employees.";
      setMsg(message);
      setEmployees([]);
      setLoading(false);
      if (res.status === 401) {
        window.location.href = "/signin";
      }
      return;
    }
    const payload = data?.data ?? data;
    const nextEmployees = normalizeHashOnlyValues(payload?.employees || []);
    setEmployees(nextEmployees);
    setSelectedEmployeeIds((prev) =>
      prev.filter((id) => nextEmployees.some((employee) => employee.id === id))
    );
    setLoading(false);
  }

  useEffect(() => {
    async function initEmployees() {
      const accessRes = await fetch("/api/client/modules?page=employee_master", { cache: "no-store" });
      const accessData = await accessRes.json().catch(() => ({}));
      const enabled = accessRes.ok ? accessData?.data?.enabled !== false : true;
      if (enabled === false) {
        setModuleEnabled(false);
        setLoading(false);
        return;
      }
      setModuleEnabled(true);
      fetchEmployees();
    }
    initEmployees();
  }, []);

  async function downloadEmployeeData() {
    const res = await fetch("/api/client/employees/export", { cache: "no-store" });
    if (!res.ok) {
      setMsg("❌ Failed to export employee data");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employee_master_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (!file) {
      alert("Please choose a file first");
      return;
    }

    setMsg("Importing file...");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/client/employees/import", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      setMsg(`❌ ${data.message || "Import failed"}`);
      return;
    }

    const payload = data?.data ?? data;
    const inserted = payload.inserted || 0;
    const replaced = payload.replaced || 0;
    setMsg(`✅ Imported successfully! (${inserted} inserted, ${replaced} replaced)`);
    setFile(null);
    fetchEmployees();
  }

  async function handleDeleteEmployee(id: string) {
    const ok = confirm("Delete this employee record?");
    if (!ok) return;

    const res = await fetch(`/api/client/employees/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      alert("Failed to delete employee");
      return;
    }

    fetchEmployees();
  }

  async function handleToggleEmploymentStatus(employee: Employee) {
    const nextStatus = employee.employmentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const confirmed = confirm(`Set ${employee.fullName || employee.empNo || "this employee"} to ${nextStatus}?`);
    if (!confirmed) return;

    const res = await fetch(`/api/client/employees/${employee.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employmentStatus: nextStatus }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMsg(data?.message || "Failed to update employee status");
      return;
    }

    setMsg(`Employee marked ${nextStatus}`);
    await fetchEmployees();
  }

  function toggleEmployeeSelection(employeeId: string) {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId]
    );
  }

  function startEditRow(employee: Employee) {
    const nextDraft: Partial<Record<FilterableEmployeeField, string>> = {};
    for (const column of EMPLOYEE_COLUMNS) {
      nextDraft[column.key] = column.key === "uanNo" ? formatUanNo(employee.uanNo).replace(/^-$/, "") : (employee[column.key] || "");
    }
    setEditDraft(nextDraft);
    setEditingRowId(employee.id);
  }

  function cancelEditRow() {
    setEditingRowId(null);
    setEditDraft({});
  }

  async function saveEditRow(id: string) {
    setSavingRow(true);
    try {
      const res = await fetch(`/api/client/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDraft),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(`❌ ${data?.message || "Failed to update employee"}`);
        return;
      }
      setMsg("✅ Employee updated successfully");
      setEditingRowId(null);
      setEditDraft({});
      await fetchEmployees();
    } finally {
      setSavingRow(false);
    }
  }

  function resetAllFiltersAndSort() {
    setEmpSortOrder("none");
    setGlobalSearch("");
    setColumnSearch({});
    setCategoricalFilters({ ...INITIAL_CATEGORICAL_FILTERS });
  }

  function navigateToEmployeeRow(id: string, openForEdit = false) {
    resetAllFiltersAndSort();

    window.setTimeout(() => {
      const element = document.getElementById(`employee-row-${id}`);
      if (!element) return;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedRowId(id);
      window.setTimeout(() => setHighlightedRowId((prev) => (prev === id ? null : prev)), 2500);

      if (openForEdit) {
        const employee = employees.find((e) => e.id === id);
        if (employee) startEditRow(employee);
      }
    }, 120);
  }

  async function handleDeleteAllEmployees() {
    const ok = confirm("Delete ALL employee records? This cannot be undone.");
    if (!ok) return;

    setDeletingAll(true);
    setMsg("Deleting all employee data...");

    try {
      const res = await fetch("/api/client/employees", {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(`❌ ${data?.message || "Failed to delete all employees"}`);
        return;
      }

      const payload = data?.data ?? data;
      const deleted = payload?.deleted ?? 0;
      setMsg(`✅ Deleted ${deleted} employee records`);
      await fetchEmployees();
    } finally {
      setDeletingAll(false);
    }
  }

  function getDisplayValue(employee: Employee, field: FilterableEmployeeField): string {
    if (field === "uanNo") return formatUanNo(employee.uanNo);
    return employee[field] || "-";
  }

  function getFilterComparableValue(employee: Employee, field: FilterableEmployeeField): string {
    const displayed = getDisplayValue(employee, field);
    return displayed === "-" ? "" : displayed.toLowerCase();
  }

  const categoricalOptions = useMemo(() => {
    const options = {} as Record<FilterableEmployeeField, string[]>;
    for (const field of CATEGORICAL_FILTER_FIELDS) {
      const values = Array.from(
        new Set(
          employees
            .map((e) => (e[field] || "").trim())
            .filter((v) => v.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
      options[field] = values;
    }
    return options;
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const globalNeedle = globalSearch.trim().toLowerCase();

    const filtered = employees.filter((employee) => {
      const categoricalMatches = CATEGORICAL_FILTER_FIELDS.every((field) => {
        const selected = categoricalFilters[field] || "ALL";
        if (selected === "ALL") return true;
        return (employee[field] || "").trim() === selected;
      });

      if (!categoricalMatches) return false;

      const columnMatches = EMPLOYEE_COLUMNS.every((column) => {
        const needle = (columnSearch[column.key] || "").trim().toLowerCase();
        if (!needle) return true;
        return getFilterComparableValue(employee, column.key).includes(needle);
      });

      if (!columnMatches) return false;

      if (!globalNeedle) return true;
      return EMPLOYEE_COLUMNS.some((column) =>
        getFilterComparableValue(employee, column.key).includes(globalNeedle)
      );
    });

    if (empSortOrder === "none") return filtered;

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      const aCode = (a.empNo || "").trim();
      const bCode = (b.empNo || "").trim();
      if (!aCode && !bCode) return 0;
      if (!aCode) return 1;
      if (!bCode) return -1;
      const compared = aCode.localeCompare(bCode, undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return empSortOrder === "asc" ? compared : -compared;
    });
    return sorted;
  }, [employees, categoricalFilters, columnSearch, globalSearch, empSortOrder]);

  const filteredEmployeeIds = useMemo(
    () => filteredEmployees.map((employee) => employee.id),
    [filteredEmployees]
  );
  const selectedEmployeeIdSet = useMemo(
    () => new Set(selectedEmployeeIds),
    [selectedEmployeeIds]
  );
  const allVisibleSelected =
    filteredEmployeeIds.length > 0 &&
    filteredEmployeeIds.every((employeeId) => selectedEmployeeIdSet.has(employeeId));

  function toggleSelectVisibleEmployees() {
    setSelectedEmployeeIds((prev) => {
      const current = new Set(prev);
      if (allVisibleSelected) {
        filteredEmployeeIds.forEach((employeeId) => current.delete(employeeId));
      } else {
        filteredEmployeeIds.forEach((employeeId) => current.add(employeeId));
      }
      return Array.from(current);
    });
  }

  async function handleBulkAction(action: "delete" | "set_active" | "set_inactive") {
    if (selectedEmployeeIds.length === 0) {
      setMsg("Select at least one employee first");
      return;
    }

    const actionLabel =
      action === "delete"
        ? "delete"
        : action === "set_active"
          ? "set active"
          : "set inactive";
    const confirmed = confirm(
      `Apply "${actionLabel}" to ${selectedEmployeeIds.length} selected employees?`
    );
    if (!confirmed) return;

    setBulkActionLoading(true);
    try {
      const res = await fetch("/api/client/employees/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          employeeIds: selectedEmployeeIds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.message || "Bulk employee action failed");
        return;
      }

      const payload = data?.data ?? data;
      setMsg(`Updated ${payload?.affected ?? selectedEmployeeIds.length} employees`);
      setSelectedEmployeeIds([]);
      await fetchEmployees();
    } finally {
      setBulkActionLoading(false);
    }
  }

  const gapItems = useMemo(() => {
    const parsedCodes = employees
      .map((e) => parseEmployeeCode(e.empNo))
      .filter((parts): parts is CodeParts => parts !== null);

    if (parsedCodes.length === 0) return [] as GapItem[];

    if (gapMode === "full") {
      const numbers = parsedCodes.map((p) => p.number);
      const min = Math.min(...numbers);
      const max = Math.max(...numbers);
      const width = Math.max(...parsedCodes.map((p) => p.width), 1);
      const existing = new Set(numbers);
      const gaps: GapItem[] = [];
      for (let n = min; n <= max; n += 1) {
        if (!existing.has(n)) {
          gaps.push({ scope: "ALL", missingCode: String(n).padStart(width, "0") });
        }
      }
      return gaps;
    }

    const byPrefix = new Map<string, CodeParts[]>();
    for (const parsed of parsedCodes) {
      const current = byPrefix.get(parsed.prefix) || [];
      current.push(parsed);
      byPrefix.set(parsed.prefix, current);
    }

    const gaps: GapItem[] = [];
    for (const [prefix, items] of byPrefix.entries()) {
      const numbers = items.map((p) => p.number);
      const min = Math.min(...numbers);
      const max = Math.max(...numbers);
      const width = Math.max(...items.map((p) => p.width), 1);
      const existing = new Set(numbers);
      for (let n = min; n <= max; n += 1) {
        if (!existing.has(n)) {
          gaps.push({
            scope: prefix || "(No Prefix)",
            missingCode: formatEmployeeCode(prefix, n, width),
          });
        }
      }
    }
    return gaps;
  }, [employees, gapMode]);

  const duplicateCodeGroups = useMemo(() => {
    const map = new Map<string, Array<{ id: string; name: string; empNo: string }>>();
    for (const e of employees) {
      const code = toCompactText(e.empNo).toUpperCase();
      if (!code) continue;
      const rows = map.get(code) || [];
      rows.push({ id: e.id, name: toCompactText(e.fullName) || "-", empNo: toCompactText(e.empNo) || "-" });
      map.set(code, rows);
    }

    return Array.from(map.entries())
      .filter(([, rows]) => rows.length > 1)
      .map(([code, rows]) => ({ code, rows }))
      .sort((a, b) => b.rows.length - a.rows.length) as DuplicateCodeGroup[];
  }, [employees]);

  const identityDuplicateGroups = useMemo(() => {
    const checks: Array<{ label: string; extractor: (e: Employee) => string }> = [
      { label: "Aadhar", extractor: (e) => normalizeDigits(e.aadharNo) },
      { label: "PAN", extractor: (e) => normalizeAlphaNumeric(e.panNo) },
      { label: "UAN", extractor: (e) => normalizeDigits(formatUanNo(e.uanNo)) },
      { label: "ESIC", extractor: (e) => normalizeDigits(e.esicNo) },
      { label: "Mobile", extractor: (e) => normalizeDigits(e.mobileNumber) },
      { label: "Bank A/c", extractor: (e) => normalizeAlphaNumeric(e.bankAcNo) },
    ];

    const groups: IdentityDuplicateGroup[] = [];
    for (const check of checks) {
      const map = new Map<string, Array<{ id: string; empNo: string; name: string }>>();
      for (const e of employees) {
        const value = check.extractor(e);
        if (!value) continue;
        const rows = map.get(value) || [];
        rows.push({
          id: e.id,
          empNo: toCompactText(e.empNo) || "-",
          name: toCompactText(e.fullName) || "-",
        });
        map.set(value, rows);
      }

      for (const [value, rows] of map.entries()) {
        const codes = new Set(rows.map((row) => row.empNo.toUpperCase()).filter((code) => code !== "-"));
        if (rows.length > 1 && codes.size > 1) {
          groups.push({ fieldLabel: check.label, value, rows });
        }
      }
    }

    return groups.sort((a, b) => b.rows.length - a.rows.length);
  }, [employees]);

  const similarNamePairs = useMemo(() => {
    const candidates = employees
      .map((e) => ({
        id: e.id,
        empNo: toCompactText(e.empNo) || "-",
        name: normalizeName(e.fullName),
        fatherSpouseName: normalizeName(e.fatherSpouseName),
      }))
      .filter((e) => e.name.length >= 4 && e.fatherSpouseName.length >= 4);

    const pairs: SimilarNamePair[] = [];
    for (let i = 0; i < candidates.length; i += 1) {
      for (let j = i + 1; j < candidates.length; j += 1) {
        const left = candidates[i];
        const right = candidates[j];
        if (left.fatherSpouseName !== right.fatherSpouseName) continue;
        const distance = levenshteinDistance(left.name, right.name);
        if (distance > 0 && distance <= 2) {
          pairs.push({
            left: {
              id: left.id,
              name: left.name,
              fatherSpouseName: left.fatherSpouseName,
              empNo: left.empNo,
            },
            right: {
              id: right.id,
              name: right.name,
              fatherSpouseName: right.fatherSpouseName,
              empNo: right.empNo,
            },
            distance,
          });
        }
      }
    }
    return pairs;
  }, [employees]);

  const fieldConflictGroups = useMemo(() => {
    const checks: Array<{ label: string; extractor: (e: Employee) => string }> = [
      { label: "UAN", extractor: (e) => normalizeDigits(formatUanNo(e.uanNo)) },
      { label: "Aadhar", extractor: (e) => normalizeDigits(e.aadharNo) },
      { label: "PAN", extractor: (e) => normalizeAlphaNumeric(e.panNo) },
      { label: "ESIC", extractor: (e) => normalizeDigits(e.esicNo) },
      { label: "Mobile", extractor: (e) => normalizeDigits(e.mobileNumber) },
      { label: "Bank A/c", extractor: (e) => normalizeAlphaNumeric(e.bankAcNo) },
    ];

    const result: FieldConflictGroup[] = [];
    for (const check of checks) {
      const map = new Map<string, Array<{ id: string; name: string; empNo: string }>>();
      for (const e of employees) {
        const value = check.extractor(e);
        if (!value) continue;
        const rows = map.get(value) || [];
        rows.push({
          id: e.id,
          name: toCompactText(e.fullName) || "-",
          empNo: toCompactText(e.empNo) || "-",
        });
        map.set(value, rows);
      }

      for (const [value, rows] of map.entries()) {
        const names = Array.from(new Set(rows.map((row) => normalizeName(row.name)).filter(Boolean)));
        if (rows.length > 1 && names.length > 1) {
          result.push({
            fieldLabel: check.label,
            value,
            names,
            rows,
          });
        }
      }
    }
    return result.sort((a, b) => b.rows.length - a.rows.length);
  }, [employees]);

  const missingCriticalRows = useMemo(() => {
    const active = CRITICAL_FIELD_OPTIONS.filter((field) => criticalFields[field.key]);
    if (active.length === 0) return [] as MissingCriticalRow[];

    return employees
      .map((e) => {
        const missingFields = active
          .filter((field) => toCompactText(e[field.key]) === "")
          .map((field) => field.label);
        return {
          id: e.id,
          empNo: toCompactText(e.empNo) || "-",
          name: toCompactText(e.fullName) || "-",
          missingFields,
        };
      })
      .filter((row) => row.missingFields.length > 0);
  }, [employees, criticalFields]);

  const invalidFormatItems = useMemo(() => {
    const items: FormatErrorItem[] = [];
    for (const e of employees) {
      const empNo = toCompactText(e.empNo) || "-";
      const name = toCompactText(e.fullName) || "-";

      const uan = normalizeDigits(formatUanNo(e.uanNo));
      if (uan && uan.length !== 12) {
        items.push({
          id: e.id,
          empNo,
          name,
          fieldLabel: "UAN",
          value: toCompactText(e.uanNo),
          expected: "12 digits",
        });
      }

      const aadhar = normalizeDigits(e.aadharNo);
      if (aadhar && aadhar.length !== 12) {
        items.push({
          id: e.id,
          empNo,
          name,
          fieldLabel: "Aadhar",
          value: toCompactText(e.aadharNo),
          expected: "12 digits",
        });
      }

      const pan = normalizeAlphaNumeric(e.panNo);
      if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
        items.push({
          id: e.id,
          empNo,
          name,
          fieldLabel: "PAN",
          value: toCompactText(e.panNo),
          expected: "AAAAA9999A",
        });
      }

      const ifsc = normalizeAlphaNumeric(e.ifscCode);
      if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
        items.push({
          id: e.id,
          empNo,
          name,
          fieldLabel: "IFSC",
          value: toCompactText(e.ifscCode),
          expected: "AAAA0XXXXXX",
        });
      }

      const mobile = normalizeDigits(e.mobileNumber);
      const isValidMobile =
        mobile.length === 10 || (mobile.length === 12 && mobile.startsWith("91"));
      if (mobile && !isValidMobile) {
        items.push({
          id: e.id,
          empNo,
          name,
          fieldLabel: "Mobile",
          value: toCompactText(e.mobileNumber),
          expected: "10 digits (or 91 + 10 digits)",
        });
      }
    }
    return items;
  }, [employees]);

  const dateLogicItems = useMemo(() => {
    const today = new Date();
    const items: DateLogicItem[] = [];

    for (const e of employees) {
      const empNo = toCompactText(e.empNo) || "-";
      const name = toCompactText(e.fullName) || "-";
      const dob = parseLooseDate(e.dob);
      const doj = parseLooseDate(e.doj);
      const dor = parseLooseDate(e.dor);

      if (toCompactText(e.dob) && !dob) {
        items.push({ id: e.id, empNo, name, issue: "Invalid DOB format" });
      }
      if (toCompactText(e.doj) && !doj) {
        items.push({ id: e.id, empNo, name, issue: "Invalid DOJ format" });
      }
      if (toCompactText(e.dor) && !dor) {
        items.push({ id: e.id, empNo, name, issue: "Invalid DOR format" });
      }

      if (dob && dob > today) {
        items.push({ id: e.id, empNo, name, issue: "DOB is in the future" });
      }
      if (dob && doj && doj < dob) {
        items.push({ id: e.id, empNo, name, issue: "DOJ is before DOB" });
      }
      if (doj && dor && dor < doj) {
        items.push({ id: e.id, empNo, name, issue: "DOR is before DOJ" });
      }
    }

    return items;
  }, [employees]);

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-slate-100">
      <ClientSidebar />

      <main className="flex-1 min-w-0 overflow-x-hidden p-8">
        {moduleEnabled === false ? (
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-blue-950">Page Disabled</h2>
            <p className="mt-2 text-slate-600">This page is not enabled by consultant.</p>
          </div>
        ) : (
          <>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-blue-950">
              Employee Master
            </h1>
            <p className="mt-1 text-slate-600">
              Upload employee master Excel/CSV and view all records in one table.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchEmployees}
              className="rounded-2xl bg-blue-900 px-5 py-2 font-semibold text-white hover:bg-blue-800"
            >
              Refresh
            </button>
            <button
              onClick={handleDeleteAllEmployees}
              disabled={deletingAll || employees.length === 0}
              className="rounded-2xl bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {deletingAll ? "Deleting..." : "Delete All"}
            </button>
          </div>
        </div>

        {/* IMPORT SECTION */}
        <div className="mt-8 rounded-3xl bg-white p-6 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-blue-950">
              Import Employee Master
            </h2>

            <button
              onClick={downloadEmployeeData}
              className="rounded-2xl bg-yellow-500 px-5 py-2 font-semibold text-blue-950 hover:bg-yellow-400"
            >
              Employee data
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full max-w-md rounded-xl border bg-white px-4 py-2 text-slate-900"
            />

            <button
              onClick={handleImport}
              className="rounded-2xl bg-green-600 px-6 py-2 font-semibold text-white hover:bg-green-500"
            >Import File</button>
          </div>

          {msg && <p className="mt-3 text-sm font-semibold text-slate-700">{msg}</p>}
        </div>

        {/* TABLE VIEW */}
        <div className="mt-10 rounded-3xl bg-white p-6 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-blue-950">
              All Employees ({filteredEmployees.length}
              {filteredEmployees.length !== employees.length ? ` / ${employees.length}` : ""})
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search all fields..."
                className="w-full min-w-[220px] max-w-[340px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              />

              <select
                value={empSortOrder}
                onChange={(e) => setEmpSortOrder(e.target.value as "none" | "asc" | "desc")}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="none">Emp Code: No Sort</option>
                <option value="asc">Emp Code: Smallest to Largest</option>
                <option value="desc">Emp Code: Largest to Smallest</option>
              </select>

              <select
                value={categoricalFilters.currentDept}
                onChange={(e) =>
                  setCategoricalFilters((prev) => ({ ...prev, currentDept: e.target.value }))
                }
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="ALL">Department: All</option>
                {categoricalOptions.currentDept.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                value={categoricalFilters.employmentStatus}
                onChange={(e) =>
                  setCategoricalFilters((prev) => ({ ...prev, employmentStatus: e.target.value }))
                }
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="ALL">Status: All</option>
                {categoricalOptions.employmentStatus.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                value={categoricalFilters.designation}
                onChange={(e) =>
                  setCategoricalFilters((prev) => ({ ...prev, designation: e.target.value }))
                }
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="ALL">Designation: All</option>
                {categoricalOptions.designation.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                value={categoricalFilters.gender}
                onChange={(e) =>
                  setCategoricalFilters((prev) => ({ ...prev, gender: e.target.value }))
                }
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="ALL">Gender: All</option>
                {categoricalOptions.gender.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                value={categoricalFilters.maritalStatus}
                onChange={(e) =>
                  setCategoricalFilters((prev) => ({ ...prev, maritalStatus: e.target.value }))
                }
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="ALL">Marital: All</option>
                {categoricalOptions.maritalStatus.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                value={categoricalFilters.religion}
                onChange={(e) =>
                  setCategoricalFilters((prev) => ({ ...prev, religion: e.target.value }))
                }
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="ALL">Religion: All</option>
                {categoricalOptions.religion.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                value={categoricalFilters.nationality}
                onChange={(e) =>
                  setCategoricalFilters((prev) => ({ ...prev, nationality: e.target.value }))
                }
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="ALL">Nationality: All</option>
                {categoricalOptions.nationality.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                value={categoricalFilters.state}
                onChange={(e) =>
                  setCategoricalFilters((prev) => ({ ...prev, state: e.target.value }))
                }
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <option value="ALL">State: All</option>
                {categoricalOptions.state.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  resetAllFiltersAndSort();
                }}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <button
              onClick={toggleSelectVisibleEmployees}
              disabled={filteredEmployeeIds.length === 0 || bulkActionLoading}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {allVisibleSelected ? "Clear Visible Selection" : "Select Visible Rows"}
            </button>
            <button
              onClick={() => handleBulkAction("set_active")}
              disabled={selectedEmployeeIds.length === 0 || bulkActionLoading}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Set Active
            </button>
            <button
              onClick={() => handleBulkAction("set_inactive")}
              disabled={selectedEmployeeIds.length === 0 || bulkActionLoading}
              className="rounded-xl bg-slate-600 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Set Inactive
            </button>
            <button
              onClick={() => handleBulkAction("delete")}
              disabled={selectedEmployeeIds.length === 0 || bulkActionLoading}
              className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Delete Selected
            </button>
            <span className="text-xs font-semibold text-slate-600">
              Selected: {selectedEmployeeIds.length}
            </span>
          </div>

          {loading ? (
            <p className="mt-4 text-slate-600">Loading employees...</p>
          ) : employees.length === 0 ? (
            <p className="mt-4 text-slate-600">
              No employees found. Import an Excel/CSV to see data here.
            </p>
          ) : (
            <div className="relative mt-6 max-w-full overflow-x-auto rounded-2xl border bg-white">
              <table className="min-w-[3200px] w-full border-collapse text-sm text-slate-900">
                <thead className="bg-slate-200 text-slate-700">
                  <tr>
                    <th className="sticky left-0 z-30 min-w-[52px] bg-slate-200 p-3 text-center">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectVisibleEmployees}
                        aria-label="Select visible employees"
                      />
                    </th>
                    {EMPLOYEE_COLUMNS.map((column) => (
                      <th
                        key={column.key}
                        className={`p-3 ${
                          column.key === "empNo"
                            ? "sticky left-[52px] z-30 min-w-[120px] bg-slate-200"
                            : column.key === "fullName"
                              ? "sticky left-[172px] z-30 min-w-[220px] bg-slate-200"
                              : "z-20 bg-slate-200"
                        }`}
                      >
                        {column.label}
                      </th>
                    ))}
                    <th className="z-20 bg-slate-200 p-3">
                      Action
                    </th>
                  </tr>
                  <tr>
                    <th className="sticky left-0 z-10 bg-slate-200 p-2" />
                    {EMPLOYEE_COLUMNS.map((column) => (
                      <th
                        key={`${column.key}-search`}
                        className={`p-2 ${
                          column.key === "empNo"
                            ? "sticky left-[52px] z-30 min-w-[120px] bg-slate-200"
                            : column.key === "fullName"
                              ? "sticky left-[172px] z-30 min-w-[220px] bg-slate-200"
                              : "z-20 bg-slate-200"
                        }`}
                      >
                        <input
                          value={columnSearch[column.key] || ""}
                          onChange={(e) =>
                            setColumnSearch((prev) => ({ ...prev, [column.key]: e.target.value }))
                          }
                          placeholder="Search..."
                          className="w-full min-w-[120px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
                        />
                      </th>
                    ))}
                    <th className="z-10 bg-slate-200 p-2" />
                  </tr>
                </thead>

                <tbody className="text-slate-900">
                  {filteredEmployees.map((e) => (
                    <tr
                      id={`employee-row-${e.id}`}
                      key={e.id}
                      className={`border-t hover:bg-slate-50 ${
                        highlightedRowId === e.id ? "bg-yellow-100" : ""
                      }`}
                    >
                      <td className="sticky left-0 z-10 min-w-[52px] bg-white p-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedEmployeeIdSet.has(e.id)}
                          onChange={() => toggleEmployeeSelection(e.id)}
                          aria-label={`Select ${e.fullName || e.empNo || "employee"}`}
                        />
                      </td>
                      {EMPLOYEE_COLUMNS.map((column) => (
                        <td
                          key={`${e.id}-${column.key}`}
                          className={`p-3 ${
                            column.key === "empNo"
                              ? "sticky left-[52px] z-10 min-w-[120px] bg-white"
                              : column.key === "fullName"
                                ? "sticky left-[172px] z-10 min-w-[220px] bg-white font-semibold text-blue-950"
                                : ""
                          }`}
                        >
                          {editingRowId === e.id ? (
                            column.key === "employmentStatus" ? (
                              <select
                                value={editDraft[column.key] ?? "ACTIVE"}
                                onChange={(event) =>
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    [column.key]: event.target.value,
                                  }))
                                }
                                className="w-full min-w-[120px] rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
                              >
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="INACTIVE">INACTIVE</option>
                              </select>
                            ) : (
                              <input
                                value={editDraft[column.key] ?? ""}
                                onChange={(event) =>
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    [column.key]: event.target.value,
                                  }))
                                }
                                className="w-full min-w-[120px] rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
                              />
                            )
                          ) : (
                            column.key === "employmentStatus" ? (
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${
                                  e.employmentStatus === "ACTIVE"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-200 text-slate-700"
                                }`}
                              >
                                {e.employmentStatus}
                              </span>
                            ) : (
                              getDisplayValue(e, column.key)
                            )
                          )}
                        </td>
                      ))}

                      <td className="p-3">
                        {editingRowId === e.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEditRow(e.id)}
                              disabled={savingRow}
                              className="rounded-xl bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-500 disabled:cursor-not-allowed disabled:bg-green-300"
                            >
                              {savingRow ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={cancelEditRow}
                              disabled={savingRow}
                              className="rounded-xl bg-slate-500 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-400 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditRow(e)}
                              className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleEmploymentStatus(e)}
                              className={`rounded-xl px-3 py-2 text-xs font-semibold text-white ${
                                e.employmentStatus === "ACTIVE"
                                  ? "bg-slate-600 hover:bg-slate-500"
                                  : "bg-emerald-600 hover:bg-emerald-500"
                              }`}
                            >
                              {e.employmentStatus === "ACTIVE" ? "Set Inactive" : "Set Active"}
                            </button>
                            <button
                              onClick={() => handleDeleteEmployee(e.id)}
                              className="rounded-xl bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-400"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <tr className="border-t">
                      <td
                        colSpan={EMPLOYEE_COLUMNS.length + 2}
                        className="p-4 text-center text-slate-600"
                      >
                        No records match current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-3 text-xs text-slate-500">Scroll horizontally to view all columns.</p>
        </div>
          </>
        )}
      </main>

      <button
        onClick={() => setCheckerOpen((prev) => !prev)}
        className="fixed bottom-6 right-4 z-40 rounded-full bg-blue-950 px-4 py-3 text-xs font-bold text-white shadow-lg hover:bg-blue-900"
      >
        {checkerOpen ? "Close Checker" : "Master Checker"}
      </button>

      <aside
        className={`fixed right-0 top-[var(--app-header-height)] z-50 h-[calc(100vh-var(--app-header-height))] w-full max-w-[460px] overflow-y-auto border-l bg-white p-4 shadow-2xl transition-transform duration-300 ${
          checkerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-blue-950">Master Checker</h3>
          <button
            onClick={() => setCheckerOpen(false)}
            className="rounded-lg border px-2 py-1 text-xs font-semibold text-slate-700"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <details open className="rounded-xl border p-3">
            <summary className="cursor-pointer font-bold text-slate-800">
              Employee Code Gap Finder ({gapItems.length})
            </summary>
            <div className="mt-2 space-y-2">
              <select
                value={gapMode}
                onChange={(e) => setGapMode(e.target.value as GapMode)}
                className="w-full rounded-lg border px-2 py-1"
              >
                <option value="full">Full Range (Min to Max)</option>
                <option value="prefix">Prefix-wise Range</option>
              </select>
              <div className="max-h-36 overflow-auto rounded-lg bg-slate-50 p-2">
                {gapItems.length === 0 ? (
                  <p>No gaps found.</p>
                ) : (
                  gapItems.slice(0, 200).map((item, idx) => (
                    <div key={`${item.scope}-${item.missingCode}-${idx}`}>
                      {item.scope}: {item.missingCode}
                    </div>
                  ))
                )}
              </div>
            </div>
          </details>

          <details className="rounded-xl border p-3">
            <summary className="cursor-pointer font-bold text-slate-800">
              Duplicate Employee Code ({duplicateCodeGroups.length})
            </summary>
            <div className="mt-2 max-h-44 space-y-2 overflow-auto rounded-lg bg-slate-50 p-2">
                {duplicateCodeGroups.length === 0 ? (
                  <p>No duplicate employee code found.</p>
                ) : (
                  duplicateCodeGroups.map((group) => (
                    <div key={group.code} className="rounded border bg-white p-2">
                      <button
                        onClick={() => group.rows[0] && navigateToEmployeeRow(group.rows[0].id)}
                        className="font-semibold text-blue-900 underline"
                      >
                        {group.code} ({group.rows.length} rows)
                      </button>
                      {group.rows.map((row) => (
                        <button
                          key={row.id}
                          onClick={() => navigateToEmployeeRow(row.id, true)}
                          className="block text-left text-blue-900 underline"
                        >
                          {row.id} | {row.name}
                        </button>
                      ))}
                    </div>
                  ))
              )}
            </div>
          </details>

          <details className="rounded-xl border p-3">
            <summary className="cursor-pointer font-bold text-slate-800">
              Similar/Probable Duplicate Person (
              {identityDuplicateGroups.length + similarNamePairs.length})
            </summary>
            <div className="mt-2 space-y-2">
              <div className="rounded-lg bg-slate-50 p-2">
                <div className="mb-1 font-semibold">
                  Same identity fields across different Emp Codes ({identityDuplicateGroups.length})
                </div>
                <div className="max-h-32 overflow-auto">
                  {identityDuplicateGroups.length === 0 ? (
                    <p>None found.</p>
                  ) : (
                    identityDuplicateGroups.map((group, idx) => (
                      <div key={`${group.fieldLabel}-${group.value}-${idx}`} className="mb-2 rounded border bg-white p-2">
                        <div className="font-semibold">
                          {group.fieldLabel}: {group.value}
                        </div>
                        {group.rows.map((row) => (
                          <button
                            key={row.id}
                            onClick={() => navigateToEmployeeRow(row.id, true)}
                            className="block text-left text-blue-900 underline"
                          >
                            {row.empNo} | {row.name}
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-2">
                <div className="mb-1 font-semibold">
                  Near-similar names (same Father/Spouse, typo distance {`<=`} 2) (
                  {similarNamePairs.length})
                </div>
                <div className="max-h-32 overflow-auto">
                  {similarNamePairs.length === 0 ? (
                    <p>None found.</p>
                  ) : (
                    similarNamePairs.map((pair, idx) => (
                      <div key={`${pair.left.id}-${pair.right.id}-${idx}`} className="mb-2 rounded border bg-white p-2">
                        <div className="font-semibold">
                          Distance {pair.distance}
                        </div>
                        <div>
                          <button
                            onClick={() => navigateToEmployeeRow(pair.left.id, true)}
                            className="text-blue-900 underline"
                          >
                            {pair.left.empNo} | {pair.left.name}
                          </button>
                        </div>
                        <div>
                          <button
                            onClick={() => navigateToEmployeeRow(pair.right.id, true)}
                            className="text-blue-900 underline"
                          >
                            {pair.right.empNo} | {pair.right.name}
                          </button>
                        </div>
                        <div>Father/Spouse: {pair.left.fatherSpouseName}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </details>

          <details className="rounded-xl border p-3">
            <summary className="cursor-pointer font-bold text-slate-800">
              Field Conflict Checker ({fieldConflictGroups.length})
            </summary>
            <div className="mt-2 max-h-44 space-y-2 overflow-auto rounded-lg bg-slate-50 p-2">
              {fieldConflictGroups.length === 0 ? (
                <p>No conflicts found.</p>
              ) : (
                fieldConflictGroups.map((group, idx) => (
                  <div key={`${group.fieldLabel}-${group.value}-${idx}`} className="rounded border bg-white p-2">
                    <div className="font-semibold">
                      {group.fieldLabel}: {group.value}
                    </div>
                    <div>Names: {group.names.join(", ")}</div>
                    <div>Rows: {group.rows.length}</div>
                    <div className="mt-1">
                      {group.rows.map((row) => (
                        <button
                          key={row.id}
                          onClick={() => navigateToEmployeeRow(row.id, true)}
                          className="mr-2 text-blue-900 underline"
                        >
                          {row.empNo}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </details>

          <details className="rounded-xl border p-3">
            <summary className="cursor-pointer font-bold text-slate-800">
              Missing Critical Fields ({missingCriticalRows.length})
            </summary>
            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2">
                {CRITICAL_FIELD_OPTIONS.map((field) => (
                  <label key={field.key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={criticalFields[field.key]}
                      onChange={(e) =>
                        setCriticalFields((prev) => ({ ...prev, [field.key]: e.target.checked }))
                      }
                    />
                    {field.label}
                  </label>
                ))}
              </div>
              <div className="max-h-36 overflow-auto rounded-lg bg-slate-50 p-2">
                {missingCriticalRows.length === 0 ? (
                  <p>No critical field gaps found.</p>
                ) : (
                  missingCriticalRows.map((row) => (
                    <div key={row.id} className="mb-2 rounded border bg-white p-2">
                      <button
                        onClick={() => navigateToEmployeeRow(row.id, true)}
                        className="font-semibold text-blue-900 underline"
                      >
                        {row.empNo} | {row.name}
                      </button>
                      <div>Missing: {row.missingFields.join(", ")}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </details>

          <details className="rounded-xl border p-3">
            <summary className="cursor-pointer font-bold text-slate-800">
              Invalid Format Checker ({invalidFormatItems.length})
            </summary>
            <div className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-50 p-2">
              {invalidFormatItems.length === 0 ? (
                <p>No format issues found.</p>
              ) : (
                invalidFormatItems.map((item, idx) => (
                  <div key={`${item.id}-${item.fieldLabel}-${idx}`} className="mb-2 rounded border bg-white p-2">
                    <button
                      onClick={() => navigateToEmployeeRow(item.id, true)}
                      className="font-semibold text-blue-900 underline"
                    >
                      {item.empNo} | {item.name}
                    </button>
                    <div>
                      {item.fieldLabel}: {item.value}
                    </div>
                    <div>Expected: {item.expected}</div>
                  </div>
                ))
              )}
            </div>
          </details>

          <details className="rounded-xl border p-3">
            <summary className="cursor-pointer font-bold text-slate-800">
              Date Logic Checker ({dateLogicItems.length})
            </summary>
            <div className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-50 p-2">
              {dateLogicItems.length === 0 ? (
                <p>No date logic issues found.</p>
              ) : (
                dateLogicItems.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="mb-2 rounded border bg-white p-2">
                    <button
                      onClick={() => navigateToEmployeeRow(item.id, true)}
                      className="font-semibold text-blue-900 underline"
                    >
                      {item.empNo} | {item.name}
                    </button>
                    <div>{item.issue}</div>
                  </div>
                ))
              )}
            </div>
          </details>
        </div>
      </aside>
    </div>
  );
}




