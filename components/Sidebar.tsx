"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<"client" | "audit" | "hr" | null>(null);

  const linkClass = (path: string) =>
    `block rounded-lg px-3 py-2 text-sm font-semibold transition ${
      pathname === path
        ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/40"
        : "text-slate-200 hover:bg-white/10 hover:text-white"
    }`;
  const inAudit = pathname.startsWith("/admin/audit");
  const inClient =
    pathname === "/admin" || pathname === "/admin/clients";
  const inHr =
    pathname === "/admin/holiday-master" || pathname === "/admin/in-out";
  const inAuditModuleGroup =
    inAudit ||
    pathname === "/admin/document-allotment" ||
    pathname === "/admin/training-calendar";

  return (
    <aside className="w-56 min-h-screen border-r border-cyan-400/20 bg-[radial-gradient(120%_80%_at_0%_0%,#1b2d7a_0%,#101a4d_45%,#0a1235_100%)] p-3 text-white">
      <div className="rounded-xl border border-white/15 bg-white/10 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <h2 className="text-base font-extrabold tracking-tight">Admin Panel</h2>
        <p className="mt-0.5 text-[11px] text-slate-300">Logged in as admin</p>
      </div>

      <nav className="mt-3 flex flex-col gap-1.5 text-sm font-semibold">
        <Link href="/admin/module-control" className={linkClass("/admin/module-control")}>
          Module Control
        </Link>

        <div
          onMouseEnter={() => setOpenGroup("client")}
          onMouseLeave={() => setOpenGroup(null)}
        >
            <button
              type="button"
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                inClient
                  ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/40"
                  : "text-slate-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              Client
            </button>
          <div
            className={`mt-1 rounded-lg p-2 ${
              openGroup === "client" ? "block" : "hidden"
            }`}
          >
            <div className="flex flex-col gap-2 text-sm">
              <Link
                href="/admin"
                className={`block rounded-lg px-3 py-2 ${
                  pathname === "/admin"
                    ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/40"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                Enquiries
              </Link>
              <Link
                href="/admin/clients"
                className={`block rounded-lg px-3 py-2 ${
                  pathname === "/admin/clients"
                    ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/40"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                Client Onboarding
              </Link>
            </div>
          </div>
        </div>

        <div
          onMouseEnter={() => setOpenGroup("hr")}
          onMouseLeave={() => setOpenGroup(null)}
        >
            <button
              type="button"
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                inHr
                  ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/40"
                  : "text-slate-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              HR
            </button>
          <div
            className={`mt-1 rounded-lg p-2 ${
              openGroup === "hr" ? "block" : "hidden"
            }`}
          >
            <div className="flex flex-col gap-2 text-sm">
              <Link
                href="/admin/holiday-master"
                className={`block rounded-lg px-3 py-2 ${
                  pathname === "/admin/holiday-master"
                    ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/40"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                Holiday Master
              </Link>
              <Link
                href="/admin/in-out"
                className={`block rounded-lg px-3 py-2 ${
                  pathname === "/admin/in-out"
                    ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/40"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                In-Out Generator
              </Link>
            </div>
          </div>
        </div>
        <div
          onMouseEnter={() => setOpenGroup("audit")}
          onMouseLeave={() => setOpenGroup(null)}
        >
            <button
              type="button"
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                inAuditModuleGroup
                  ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/40"
                  : "text-slate-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              Audit Module
            </button>
          <div
            className={`mt-1 rounded-lg p-2 ${
              openGroup === "audit" ? "block" : "hidden"
            }`}
          >
            <div className="flex flex-col gap-2 text-sm">
              <Link
                href="/admin/audit/program"
                className={`block rounded-lg px-3 py-2 ${
                  pathname === "/admin/audit/program"
                    ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/40"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                Add Audit
              </Link>
              <Link
                href="/admin/audit/client"
                className={`block rounded-lg px-3 py-2 ${
                  pathname === "/admin/audit/client"
                    ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/40"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                Client Audit Log
              </Link>
              <Link
                href="/admin/document-allotment"
                className={`block rounded-lg px-3 py-2 ${
                  pathname === "/admin/document-allotment"
                    ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/40"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                Document Allotment
              </Link>
              <Link
                href="/admin/training-calendar"
                className={`block rounded-lg px-3 py-2 ${
                  pathname === "/admin/training-calendar"
                    ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/40"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                Training Calendar
              </Link>
            </div>
          </div>
        </div>

        <Link href="/admin/client-connect" className={linkClass("/admin/client-connect")}>
          DC Connect
        </Link>
      </nav>
    </aside>
  );
}
