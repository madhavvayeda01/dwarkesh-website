"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ADMIN_PAGE_DEFINITIONS,
  type AdminPageAccessMap,
  type AdminPageDefinition,
} from "@/lib/admin-config";

type AdminSession = {
  name: string;
  type: "env_admin" | "consultant";
};

type AdminMeResponse = {
  loggedIn?: boolean;
  admin?: AdminSession;
  allowedPages?: AdminPageAccessMap;
};

type GroupKey = "core" | "client" | "hr" | "compliance" | "ops" | "audit" | "chat";

const GROUP_LABELS: Record<GroupKey, string> = {
  core: "Core",
  client: "Client",
  hr: "HR",
  compliance: "Compliance",
  ops: "Operations",
  audit: "Audit Module",
  chat: "Communication",
};

function isGroupActive(pathname: string, group: GroupKey) {
  if (group === "core") {
    return pathname === "/admin/module-control" || pathname === "/admin/settings";
  }
  if (group === "client") {
    return pathname === "/admin" || pathname === "/admin/clients";
  }
  if (group === "hr") {
    return pathname === "/admin/document-allotment";
  }
  if (group === "compliance") {
    return pathname.startsWith("/admin/compliance/");
  }
  if (group === "ops") {
    return pathname === "/admin/holiday-master" || pathname === "/admin/in-out";
  }
  if (group === "audit") {
    return pathname.startsWith("/admin/audit") || pathname === "/admin/training-calendar";
  }
  return pathname === "/admin/client-connect";
}

export default function Sidebar() {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<GroupKey | null>(null);
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [allowedPages, setAllowedPages] = useState<AdminPageAccessMap | null>(null);

  useEffect(() => {
    async function loadAdmin() {
      const res = await fetch("/api/admin/me", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { data?: AdminMeResponse } & AdminMeResponse;
      const payload = data.data ?? data;
      if (payload.loggedIn && payload.admin) {
        setAdmin({
          name: payload.admin.name || "Primary Admin",
          type: payload.admin.type || "env_admin",
        });
        setAllowedPages(payload.allowedPages || null);
      }
    }

    void loadAdmin();
  }, []);

  const visiblePages = useMemo(() => {
    if (!allowedPages) return ADMIN_PAGE_DEFINITIONS;
    return ADMIN_PAGE_DEFINITIONS.filter((page) => allowedPages[page.key] !== false);
  }, [allowedPages]);

  const groupedPages = useMemo(() => {
    return {
      core: visiblePages.filter((page) => page.group === "core"),
      client: visiblePages.filter((page) => page.group === "client"),
      hr: visiblePages.filter((page) => page.group === "hr"),
      compliance: visiblePages.filter((page) => page.group === "compliance"),
      ops: visiblePages.filter((page) => page.group === "ops"),
      audit: visiblePages.filter((page) => page.group === "audit"),
      chat: visiblePages.filter((page) => page.group === "chat"),
    };
  }, [visiblePages]);

  const linkClass = (path: string) =>
    `block rounded-lg px-3 py-2 text-sm font-semibold transition ${
      pathname === path
        ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/40"
        : "text-slate-200 hover:bg-white/10 hover:text-white"
    }`;

  function renderPageLink(page: AdminPageDefinition) {
    return (
      <Link key={page.key} href={page.href} className={linkClass(page.href)}>
        {page.label}
      </Link>
    );
  }

  function renderGroup(group: GroupKey) {
    const pages = groupedPages[group];
    if (pages.length === 0) return null;

    return (
      <div onMouseEnter={() => setOpenGroup(group)} onMouseLeave={() => setOpenGroup(null)}>
        <button
          type="button"
          className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
            isGroupActive(pathname, group)
              ? "bg-cyan-400/20 text-cyan-100 ring-1 ring-cyan-300/40"
              : "text-slate-200 hover:bg-white/10 hover:text-white"
          }`}
        >
          {GROUP_LABELS[group]}
        </button>
        <div className={`mt-1 rounded-lg p-2 ${openGroup === group ? "block" : "hidden"}`}>
          <div className="flex flex-col gap-2 text-sm">{pages.map(renderPageLink)}</div>
        </div>
      </div>
    );
  }

  return (
    <aside className="w-56 min-h-screen border-r border-cyan-400/20 bg-[radial-gradient(120%_80%_at_0%_0%,#1b2d7a_0%,#101a4d_45%,#0a1235_100%)] p-3 text-white">
      <div className="rounded-xl border border-white/15 bg-white/10 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <h2 className="text-base font-extrabold tracking-tight">Admin Panel</h2>
        <p className="mt-0.5 text-[11px] text-slate-300">
          {admin
            ? `${admin.type === "consultant" ? "Consultant" : "Primary Admin"}: ${admin.name}`
            : "Admin access"}
        </p>
      </div>

      <nav className="mt-3 flex flex-col gap-1.5 text-sm font-semibold">
        {renderGroup("core")}
        {renderGroup("client")}
        {renderGroup("hr")}
        {renderGroup("compliance")}
        {renderGroup("ops")}
        {renderGroup("audit")}
        {renderGroup("chat")}
      </nav>
    </aside>
  );
}
