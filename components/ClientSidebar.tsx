"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CLIENT_PAGE_DEFINITIONS, DEFAULT_PAGE_ACCESS, type ClientPageKey, type PageAccessMap } from "@/lib/module-config";

type ModulesResponse = {
  pages?: PageAccessMap;
};

const PAGE_BY_KEY = Object.fromEntries(
  CLIENT_PAGE_DEFINITIONS.map((page) => [page.key, page])
) as Record<ClientPageKey, (typeof CLIENT_PAGE_DEFINITIONS)[number]>;

const SALARY_GROUPS = {
  payroll: ["payroll", "payroll_data", "payslip", "payslip_data"] as ClientPageKey[],
  advance: ["advance", "advance_data"] as ClientPageKey[],
  compliance: ["pf_challan", "esic_challan"] as ClientPageKey[],
  attendance: ["in_out", "in_out_data"] as ClientPageKey[],
};

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

  const hasEmployeeGroup = ["employee_master", "add_employee", "personal_documents"].some((key) =>
    visiblePageLinks.has(key as ClientPageKey)
  );
  const hasAuditGroup = ["audit_dashboard", "training", "committees"].some((key) =>
    visiblePageLinks.has(key as ClientPageKey)
  );
  const hasChat = visiblePageLinks.has("dc_connect");
  const hasSalaryGroup = Object.values(SALARY_GROUPS).some((group) =>
    group.some((key) => visiblePageLinks.has(key))
  );

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

        {hasEmployeeGroup && (
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
              {(["employee_master", "add_employee", "personal_documents"] as ClientPageKey[])
                .filter((key) => visiblePageLinks.has(key))
                .map((key) => (
                  <Link key={key} href={PAGE_BY_KEY[key].href} className={linkClass(PAGE_BY_KEY[key].href)}>
                    {PAGE_BY_KEY[key].label}
                  </Link>
                ))}
            </div>
          </div>
        )}

        {hasSalaryGroup && (
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
              {(Object.entries(SALARY_GROUPS) as Array<
                [keyof typeof SALARY_GROUPS, ClientPageKey[]]
              >).map(([sectionKey, pageKeys]) => {
                const visiblePages = pageKeys.filter((key) => visiblePageLinks.has(key));
                if (visiblePages.length === 0) return null;

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
                      {sectionKey === "payroll"
                        ? "Payroll"
                        : sectionKey === "advance"
                        ? "Advance"
                        : sectionKey === "compliance"
                        ? "Compliance"
                        : "Attendance"}
                    </button>

                    {isActive && (
                      <div className="space-y-2 pl-2">
                        {visiblePages.map((key) => (
                          <Link key={key} href={PAGE_BY_KEY[key].href} className={linkClass(PAGE_BY_KEY[key].href)}>
                            {PAGE_BY_KEY[key].label}
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

        {hasAuditGroup && (
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
              {(["audit_dashboard", "training", "committees"] as ClientPageKey[])
                .filter((key) => visiblePageLinks.has(key))
                .map((key) => (
                  <Link key={key} href={PAGE_BY_KEY[key].href} className={linkClass(PAGE_BY_KEY[key].href)}>
                    {PAGE_BY_KEY[key].label}
                  </Link>
                ))}
            </div>
          </div>
        )}

        {hasChat && (
          <Link href={PAGE_BY_KEY.dc_connect.href} className={linkClass(PAGE_BY_KEY.dc_connect.href)}>
            {PAGE_BY_KEY.dc_connect.label}
          </Link>
        )}
      </nav>
    </aside>
  );
}
