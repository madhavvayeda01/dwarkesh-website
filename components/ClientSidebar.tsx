"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CLIENT_PAGE_DEFINITIONS,
  DEFAULT_PAGE_ACCESS,
  type ClientPageKey,
  type PageAccessMap,
} from "@/lib/module-config";
import {
  SidebarIcon,
  type SidebarIconName,
  getClientPageIcon,
  getClientSectionIcon,
  getSalarySubgroupIcon,
} from "@/components/sidebar-icons";
import {
  useDashboardSidebarState,
} from "@/components/useDashboardSidebarState";

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
  const accessFetchInFlightRef = useRef(false);
  const lastAccessFetchAtRef = useRef(0);
  const {
    collapsed,
    compact,
    hovered,
    handlePointerEnter,
    handlePointerLeave,
    handleFocusCapture,
    handleBlurCapture,
  } =
    useDashboardSidebarState({
      storageKey: "dwarkesh_client_sidebar_state",
    });

  useEffect(() => {
    let cancelled = false;

    async function loadAccess(options?: { force?: boolean }) {
      if (accessFetchInFlightRef.current) return;
      const now = Date.now();
      if (!options?.force && now - lastAccessFetchAtRef.current < 1500) return;

      accessFetchInFlightRef.current = true;
      try {
        const res = await fetch("/api/client/modules", { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as { data?: ModulesResponse };
        if (!res.ok || cancelled) return;
        lastAccessFetchAtRef.current = Date.now();
        if (!cancelled) {
          setPages({ ...DEFAULT_PAGE_ACCESS, ...(data?.data?.pages || {}) });
        }
      } finally {
        accessFetchInFlightRef.current = false;
      }
    }

    function handleVisibilityRefresh() {
      if (document.visibilityState === "visible") {
        void loadAccess();
      }
    }

    void loadAccess({ force: true });

    window.addEventListener("focus", handleVisibilityRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleVisibilityRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
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
    `app-sidebar-navitem rounded-[1rem] px-3 py-2.5 text-sm font-semibold transition ${
      pathname === path
        ? "border-white/20 bg-white/14 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
        : "text-slate-200 hover:bg-white/10 hover:text-white"
    }`;

  const groupButtonClass = (active: boolean) =>
    `app-sidebar-navitem w-full rounded-[1rem] px-3 py-2.5 text-left text-sm font-semibold transition ${
      active
        ? "border-white/20 bg-white/14 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
        : "text-slate-300 hover:bg-white/10 hover:text-white"
    }`;

  function renderSidebarLink(label: string, href: string, iconName: SidebarIconName) {
    return (
      <Link href={href} className={linkClass(href)} title={label}>
        <span className="app-sidebar-navitem__glyph">
          <SidebarIcon name={iconName} />
        </span>
        <span className="app-sidebar-navitem__text truncate">{label}</span>
      </Link>
    );
  }

  return (
    <aside
      className="app-dashboard-sidebar"
      data-sidebar-kind="client"
      data-collapsed={collapsed}
      data-compact={compact}
      data-hovered={hovered}
      onMouseEnter={handlePointerEnter}
      onMouseLeave={handlePointerLeave}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
    >
      <div className="app-dashboard-sidebar__inner text-white">
        <nav className="app-sidebar-nav mt-3 flex flex-col gap-1.5">
          {renderSidebarLink(
            "Dashboard",
            "/client-dashboard",
            getClientSectionIcon("dashboard")
          )}

          {employeePages.length > 0 && (
            <div className="app-sidebar-group group">
              <button
                type="button"
                title="Employee Data"
                className={`app-sidebar-navitem w-full rounded-[1rem] px-3 py-2.5 text-left text-sm font-semibold transition ${
                  inEmployeeData
                    ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/40"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="app-sidebar-navitem__glyph">
                  <SidebarIcon name={getClientSectionIcon("employee_data")} />
                </span>
                <span className="app-sidebar-navitem__text truncate">Employee Data</span>
              </button>

              <div
                className={`app-sidebar-group__content mt-1 rounded-[1.05rem] p-2 ${
                  !compact && inEmployeeData
                    ? "app-sidebar-group__panel block"
                    : !compact
                      ? "app-sidebar-group__panel hidden group-hover:block"
                      : "hidden"
                }`}
              >
                {employeePages.map((page) => (
                  <div key={page.key}>
                    {renderSidebarLink(page.label, page.href, getClientPageIcon(page.key))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {salarySubgroups.length > 0 && (
            <div className="app-sidebar-group group">
              <button
                type="button"
                title="Salary"
                className={`app-sidebar-navitem w-full rounded-[1rem] px-3 py-2.5 text-left text-sm font-semibold transition ${
                  inSalaryData
                    ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/40"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="app-sidebar-navitem__glyph">
                  <SidebarIcon name={getClientSectionIcon("salary")} />
                </span>
                <span className="app-sidebar-navitem__text truncate">Salary</span>
              </button>

              <div
                className={`app-sidebar-group__content mt-1 rounded-[1.05rem] p-2 ${
                  !compact && inSalaryData
                    ? "app-sidebar-group__panel block"
                    : !compact
                      ? "app-sidebar-group__panel hidden group-hover:block"
                      : "hidden"
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
                    <div key={sectionKey} className="group/section space-y-2">
                      <button
                        type="button"
                        className={groupButtonClass(isActive)}
                        title={section.label}
                        aria-expanded={!compact && isActive}
                        onClick={() =>
                          setOpenSalarySection((prev) =>
                            prev === sectionKey ? "none" : sectionKey
                          )
                        }
                      >
                        <span className="app-sidebar-navitem__glyph">
                          <SidebarIcon name={getSalarySubgroupIcon(sectionKey)} />
                        </span>
                        <span className="app-sidebar-navitem__text truncate">
                          {section.label}
                        </span>
                        <span
                          className={`app-sidebar-navitem__caret text-xs ${
                            isActive ? "rotate-90" : "group-hover/section:rotate-90"
                          }`}
                          aria-hidden="true"
                        >
                          &gt;
                        </span>
                      </button>

                      {!compact && (
                        <div
                          className={`space-y-2 pl-2 ${
                            isActive ? "block" : "hidden group-hover/section:block"
                          }`}
                        >
                          {section.pages.map((page) => (
                            <div key={page.key}>
                              {renderSidebarLink(page.label, page.href, getClientPageIcon(page.key))}
                            </div>
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
            <div className="app-sidebar-group group">
              <button
                type="button"
                title="Compliance"
                className={`app-sidebar-navitem w-full rounded-[1rem] px-3 py-2.5 text-left text-sm font-semibold transition ${
                  inComplianceData
                    ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/40"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="app-sidebar-navitem__glyph">
                  <SidebarIcon name={getClientSectionIcon("compliance")} />
                </span>
                <span className="app-sidebar-navitem__text truncate">Compliance</span>
              </button>

              <div
                className={`app-sidebar-group__content mt-1 rounded-[1.05rem] p-2 ${
                  !compact && inComplianceData
                    ? "app-sidebar-group__panel block"
                    : !compact
                      ? "app-sidebar-group__panel hidden group-hover:block"
                      : "hidden"
                }`}
              >
                {compliancePages.map((page) => (
                  <div key={page.key}>
                    {renderSidebarLink(page.label, page.href, getClientPageIcon(page.key))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {auditPages.length > 0 && (
            <div className="app-sidebar-group group">
              <button
                type="button"
                title="Audit Module"
                className={`app-sidebar-navitem w-full rounded-[1rem] px-3 py-2.5 text-left text-sm font-semibold transition ${
                  inAuditData
                    ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/40"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="app-sidebar-navitem__glyph">
                  <SidebarIcon name={getClientSectionIcon("audit_module")} />
                </span>
                <span className="app-sidebar-navitem__text truncate">Audit Module</span>
              </button>

              <div
                className={`app-sidebar-group__content mt-1 rounded-[1.05rem] p-2 ${
                  !compact && inAuditData
                    ? "app-sidebar-group__panel block"
                    : !compact
                      ? "app-sidebar-group__panel hidden group-hover:block"
                      : "hidden"
                }`}
              >
                {auditPages.map((page) => (
                  <div key={page.key}>
                    {renderSidebarLink(page.label, page.href, getClientPageIcon(page.key))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {chatPages.map((page) => (
            <div key={page.key}>
              {renderSidebarLink(page.label, page.href, getClientPageIcon(page.key))}
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
