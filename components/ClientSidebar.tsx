"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type ModuleMap = {
  employees: boolean;
  payroll: boolean;
  in_out: boolean;
  training: boolean;
  committees: boolean;
  documents: boolean;
  audit: boolean;
  chat: boolean;
  notifications: boolean;
};

const ALL_ENABLED: ModuleMap = {
  employees: true,
  payroll: true,
  in_out: true,
  training: true,
  committees: true,
  documents: true,
  audit: true,
  chat: true,
  notifications: true,
};

export default function ClientSidebar() {
  const pathname = usePathname();
  const [modules, setModules] = useState<ModuleMap>(ALL_ENABLED);

  useEffect(() => {
    async function loadModules() {
      const res = await fetch("/api/client/modules", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setModules({ ...ALL_ENABLED, ...(data?.data?.modules || {}) });
    }
    loadModules();
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

  const showEmployeeGroup = modules.employees || modules.documents;
  const showSalaryGroup = modules.payroll || modules.in_out;
  const showAuditGroup = modules.audit || modules.training || modules.committees;

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

        {showEmployeeGroup && (
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
                inEmployeeData ? "block bg-white/8 ring-1 ring-white/15" : "hidden bg-white/5 group-hover:block ring-1 ring-white/10"
              }`}
            >
              {modules.employees && (
                <>
                  <Link href="/client/employees" className={linkClass("/client/employees")}>
                    Employee Master
                  </Link>
                  <Link href="/client/employees/new" className={linkClass("/client/employees/new")}>
                    Add New Employee
                  </Link>
                </>
              )}
              {modules.documents && (
                <Link href="/client/documents" className={linkClass("/client/documents")}>
                  Personal File Documents
                </Link>
              )}
            </div>
          </div>
        )}

        {showSalaryGroup && (
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
                inSalaryData ? "block bg-white/8 ring-1 ring-white/15" : "hidden bg-white/5 group-hover:block ring-1 ring-white/10"
              }`}
            >
              {modules.payroll && (
                <>
                  <div className="space-y-2">
                    <button
                      type="button"
                      className={groupButtonClass(inPayrollGroup || visibleSalarySection === "payroll")}
                      onClick={() =>
                        setOpenSalarySection((prev) => (prev === "payroll" ? "none" : "payroll"))
                      }
                    >
                      Payroll
                    </button>
                    {(inPayrollGroup || visibleSalarySection === "payroll") && (
                      <div className="space-y-2 pl-2">
                        <Link href="/client/payroll" className={linkClass("/client/payroll")}>
                          Payroll
                        </Link>
                        <Link href="/client/payroll-data" className={linkClass("/client/payroll-data")}>
                          Payroll Data
                        </Link>
                        <Link href="/client/payslip" className={linkClass("/client/payslip")}>
                          Payslip
                        </Link>
                        <Link href="/client/payslip-data" className={linkClass("/client/payslip-data")}>
                          Payslip Data
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      className={groupButtonClass(inAdvanceGroup || visibleSalarySection === "advance")}
                      onClick={() =>
                        setOpenSalarySection((prev) => (prev === "advance" ? "none" : "advance"))
                      }
                    >
                      Advance
                    </button>
                    {(inAdvanceGroup || visibleSalarySection === "advance") && (
                      <div className="space-y-2 pl-2">
                        <Link href="/client/advance" className={linkClass("/client/advance")}>
                          Advance
                        </Link>
                        <Link href="/client/advance-data" className={linkClass("/client/advance-data")}>
                          Advance Data
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      className={groupButtonClass(inComplianceGroup || visibleSalarySection === "compliance")}
                      onClick={() =>
                        setOpenSalarySection((prev) => (prev === "compliance" ? "none" : "compliance"))
                      }
                    >
                      Compliance
                    </button>
                    {(inComplianceGroup || visibleSalarySection === "compliance") && (
                      <div className="space-y-2 pl-2">
                        <Link href="/client/pf-challan" className={linkClass("/client/pf-challan")}>
                          PF Challan
                        </Link>
                        <Link href="/client/esic-challan" className={linkClass("/client/esic-challan")}>
                          ESIC Challan
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              )}
              {modules.in_out && (
                <div className="space-y-2">
                  <button
                    type="button"
                    className={groupButtonClass(inAttendanceGroup || visibleSalarySection === "attendance")}
                    onClick={() =>
                      setOpenSalarySection((prev) => (prev === "attendance" ? "none" : "attendance"))
                    }
                  >
                    Attendance
                  </button>
                  {(inAttendanceGroup || visibleSalarySection === "attendance") && (
                    <div className="space-y-2 pl-2">
                      <Link href="/client/in-out" className={linkClass("/client/in-out")}>
                        IN-OUT
                      </Link>
                      <Link href="/client/in-out-data" className={linkClass("/client/in-out-data")}>
                        IN-OUT Data
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {showAuditGroup && (
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
                inAuditData ? "block bg-white/8 ring-1 ring-white/15" : "hidden bg-white/5 group-hover:block ring-1 ring-white/10"
              }`}
            >
              {modules.audit && (
                <Link href="/client/audit" className={linkClass("/client/audit")}>
                  Audit Dashboard
                </Link>
              )}
              {modules.training && (
                <Link href="/client/training" className={linkClass("/client/training")}>
                  Training
                </Link>
              )}
              {modules.committees && (
                <Link href="/client/committees" className={linkClass("/client/committees")}>
                  Committees
                </Link>
              )}
            </div>
          </div>
        )}

        {modules.chat && (
          <Link href="/client/chat" className={linkClass("/client/chat")}>
            DC Connect
          </Link>
        )}
      </nav>
    </aside>
  );
}
