"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CLIENT_PAGE_DEFINITIONS, DEFAULT_PAGE_ACCESS, type ClientPageKey, type PageAccessMap } from "@/lib/module-config";

type ModulesResponse = {
  pages?: PageAccessMap;
};

const SALARY_SUBGROUP_ORDER = ["payroll", "advance", "compliance", "attendance"] as const;
const SALARY_SUBGROUP_LABELS = {
  payroll: "Payroll",
  advance: "Advance",
  compliance: "Compliance",
  attendance: "Attendance",
} as const;

export default function ClientSidebar() {
  const pathname = usePathname();
  const [pages, setPages] = useState<PageAccessMap>(DEFAULT_PAGE_ACCESS);

  useEffect(() => {
    async function loadAccess() {
      const res = await fetch("/api/client/modules", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { data?: ModulesResponse };
      if (!res.ok) return;
      setPages({ ...DEFAULT_PAGE_ACCESS, ...(data?.data?.pages || {}) });
    }

    loadAccess();
  }, []);

  const inEmployeeData =
    pathname.startsWith("/client/employees") || pathname.startsWith("/client/documents");
  const inComplianceData =
    pathname.startsWith("/client/compliance/legal-docs") ||
    pathname.startsWith("/client/compliance/trainings") ||
    pathname.startsWith("/client/compliance/committee-meetings");
  const inAuditData =
    pathname.startsWith("/client/audit") ||
    pathname.startsWith("/client/training") ||
    pathname.startsWith("/client/committees");
  const inSalaryData =
    pathname.startsWith("/client/payroll") ||
    pathname.startsWith("/client/payroll-data") ||
    pathname.startsWith("/client/payslip") ||
    pathname.startsWith("/client/payslip-data") ||
    pathname.startsWith("/client/in-out") ||
    pathname.startsWith("/client/in-out-data") ||
    pathname.startsWith("/client/pf-challan") ||
    pathname.startsWith("/client/esic-challan") ||
    pathname.startsWith("/client/advance") ||
    pathname.startsWith("/client/advance-data");

  const inPayrollGroup =
    pathname.startsWith("/client/payroll") ||
    pathname.startsWith("/client/payroll-data") ||
    pathname.startsWith("/client/payslip") ||
    pathname.startsWith("/client/payslip-data");
  const inAdvanceGroup =
    pathname.startsWith("/client/advance") || pathname.startsWith("/client/advance-data");
  const inComplianceGroup =
    pathname.startsWith("/client/pf-challan") || pathname.startsWith("/client/esic-challan");
  const inAttendanceGroup =
    pathname.startsWith("/client/in-out") || pathname.startsWith("/client/in-out-data");

  const [openSalarySection, setOpenSalarySection] = useState<
    "payroll" | "advance" | "compliance" | "attendance" | "none" | null
  >(null);

  const activeSalarySection: "payroll" | "advance" | "compliance" | "attendance" | null =
    inPayrollGroup
      ? "payroll"
      : inAdvanceGroup
      ? "advance"
      : inComplianceGroup
      ? "compliance"
      : inAttendanceGroup
      ? "attendance"
      : null;

  const visibleSalarySection =
    openSalarySection === "none" ? null : openSalarySection || activeSalarySection;

  const visiblePageLinks = useMemo(() => {
    const enabledKeys = Object.entries(pages)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key as ClientPageKey);
    return new Set(enabledKeys);
  }, [pages]);

  const visiblePages = useMemo(
    () => CLIENT_PAGE_DEFINITIONS.filter((page) => visiblePageLinks.has(page.key)),
    [visiblePageLinks]
  );

  const employeePages = useMemo(
    () => visiblePages.filter((page) => page.navGroup === "employee_data"),
    [visiblePages]
  );
  const auditPages = useMemo(
    () => visiblePages.filter((page) => page.navGroup === "audit_module"),
    [visiblePages]
  );
  const compliancePages = useMemo(
    () => visiblePages.filter((page) => page.navGroup === "compliance"),
    [visiblePages]
  );
  const chatPages = useMemo(
    () => visiblePages.filter((page) => page.navGroup === "chat"),
    [visiblePages]
  );
  const salarySubgroups = useMemo(() => {
    return SALARY_SUBGROUP_ORDER.map((subGroup) => ({
      key: subGroup,
      label: SALARY_SUBGROUP_LABELS[subGroup],
      pages: visiblePages.filter(
        (page) => page.navGroup === "salary" && page.subGroup === subGroup
      ),
    })).filter((section) => section.pages.length > 0);
  }, [visiblePages]);

  const linkClass = (path: string) =>
    `block rounded-lg px-3 py-2 text-sm font-semibold transition ${
      pathname === path
        ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/40 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]"
        : "text-slate-200 hover:bg-white/10 hover:text-white"
    }`;

  const groupButtonClass = (active: boolean) =>
    `w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
      active
        ? "bg-cyan-400/15 text-cyan-100 ring-1 ring-cyan-300/30"
        : "text-slate-300 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <aside className="w-56 shrink-0 border-r border-cyan-400/20 bg-[radial-gradient(120%_80%_at_0%_0%,#1b2d7a_0%,#101a4d_45%,#0a1235_100%)] p-3 text-white">
      <div className="rounded-xl border border-white/15 bg-white/10 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
        <h2 className="text-base font-extrabold tracking-tight">Client Panel</h2>
        <p className="mt-0.5 text-[11px] text-slate-300">Dwarkesh Consultancy</p>
      </div>

      <nav className="mt-3 flex flex-col gap-1.5">
        <Link href="/client-dashboard" className={linkClass("/client-dashboard")}>
          Dashboard
        </Link>

        {employeePages.length > 0 && (
          <div className="group">
            <button
              type="button"
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                inEmployeeData
                  ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/40"
                  : "text-slate-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              Employee Data
            </button>

            <div
              className={`mt-1 rounded-lg p-2 ${
                inEmployeeData
                  ? "block bg-white/8 ring-1 ring-white/15"
                  : "hidden bg-white/5 ring-1 ring-white/10 group-hover:block"
              }`}
            >
              {employeePages.map((page) => (
                <Link key={page.key} href={page.href} className={linkClass(page.href)}>
                  {page.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {salarySubgroups.length > 0 && (
          <div className="group">
            <button
              type="button"
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                inSalaryData
                  ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/40"
                  : "text-slate-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              SALARY
            </button>

            <div
              className={`mt-1 rounded-lg p-2 ${
                inSalaryData
                  ? "block bg-white/8 ring-1 ring-white/15"
                  : "hidden bg-white/5 ring-1 ring-white/10 group-hover:block"
              }`}
            >
              {salarySubgroups.map((section) => {
                const sectionKey = section.key;
                const isActive =
                  sectionKey === "payroll"
                    ? inPayrollGroup || visibleSalarySection === "payroll"
                    : sectionKey === "advance"
                    ? inAdvanceGroup || visibleSalarySection === "advance"
                    : sectionKey === "compliance"
                    ? inComplianceGroup || visibleSalarySection === "compliance"
                    : inAttendanceGroup || visibleSalarySection === "attendance";

                return (
                  <div key={sectionKey} className="space-y-2">
                    <button
                      type="button"
                      className={groupButtonClass(isActive)}
                      onClick={() =>
                        setOpenSalarySection((prev) =>
                          prev === sectionKey ? "none" : sectionKey
                        )
                      }
                    >
                      {section.label}
                    </button>

                    {isActive && (
                      <div className="space-y-2 pl-2">
                        {section.pages.map((page) => (
                          <Link key={page.key} href={page.href} className={linkClass(page.href)}>
                            {page.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {compliancePages.length > 0 && (
          <div className="group">
            <button
              type="button"
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                inComplianceData
                  ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/40"
                  : "text-slate-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              Compliance
            </button>

            <div
              className={`mt-1 rounded-lg p-2 ${
                inComplianceData
                  ? "block bg-white/8 ring-1 ring-white/15"
                  : "hidden bg-white/5 ring-1 ring-white/10 group-hover:block"
              }`}
            >
              {compliancePages.map((page) => (
                <Link key={page.key} href={page.href} className={linkClass(page.href)}>
                  {page.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {auditPages.length > 0 && (
          <div className="group">
            <button
              type="button"
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                inAuditData
                  ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/40"
                  : "text-slate-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              Audit Module
            </button>

            <div
              className={`mt-1 rounded-lg p-2 ${
                inAuditData
                  ? "block bg-white/8 ring-1 ring-white/15"
                  : "hidden bg-white/5 ring-1 ring-white/10 group-hover:block"
              }`}
            >
              {auditPages.map((page) => (
                <Link key={page.key} href={page.href} className={linkClass(page.href)}>
                  {page.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {chatPages.map((page) => (
          <Link key={page.key} href={page.href} className={linkClass(page.href)}>
            {page.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
