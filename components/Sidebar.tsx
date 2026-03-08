"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ADMIN_PAGE_DEFINITIONS,
  type AdminPageAccessMap,
  type AdminPageDefinition,
} from "@/lib/admin-config";
import {
  SidebarIcon,
  getAdminGroupIcon,
  getAdminPageIcon,
} from "@/components/sidebar-icons";
import {
  useDashboardSidebarState,
} from "@/components/useDashboardSidebarState";

type AdminMeResponse = {
  loggedIn?: boolean;
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
    return (
      pathname === "/admin/holiday-master" ||
      pathname === "/admin/shift-master" ||
      pathname === "/admin/in-out"
    );
  }
  if (group === "audit") {
    return pathname.startsWith("/admin/audit") || pathname === "/admin/training-calendar";
  }
  return pathname === "/admin/client-connect";
}

export default function Sidebar() {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<GroupKey | null>(null);
  const [allowedPages, setAllowedPages] = useState<AdminPageAccessMap | null>(null);
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
      storageKey: "dwarkesh_admin_sidebar_state",
    });

  useEffect(() => {
    async function loadAdmin() {
      const res = await fetch("/api/admin/me", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { data?: AdminMeResponse } & AdminMeResponse;
      const payload = data.data ?? data;
      if (payload.loggedIn) {
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
    `app-sidebar-navitem rounded-[1rem] px-3 py-2.5 text-sm font-semibold transition ${
      pathname === path
        ? "border-white/20 bg-white/14 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
        : "text-slate-200 hover:bg-white/10 hover:text-white"
    }`;

  function renderPageLink(page: AdminPageDefinition) {
    return (
      <Link key={page.key} href={page.href} className={linkClass(page.href)} title={page.label}>
        <span className="app-sidebar-navitem__glyph">
          <SidebarIcon name={getAdminPageIcon(page.key)} />
        </span>
        <span className="app-sidebar-navitem__text truncate">{page.label}</span>
      </Link>
    );
  }

  function renderGroup(group: GroupKey) {
    const pages = groupedPages[group];
    if (pages.length === 0) return null;
    const active = isGroupActive(pathname, group);
    const expanded = !compact && (openGroup === group || (openGroup === null && active));

    return (
      <div className="app-sidebar-group group/sidebar-section space-y-1">
        <button
          type="button"
          className={`app-sidebar-navitem rounded-[1rem] px-3 py-2.5 text-left text-sm transition ${
            active
              ? "border-white/20 bg-white/14 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              : "text-slate-200 hover:bg-white/10 hover:text-white"
          }`}
          title={GROUP_LABELS[group]}
          aria-expanded={expanded}
          onClick={() =>
            setOpenGroup((prev) => (prev === group ? null : group))
          }
        >
          <span className="app-sidebar-navitem__glyph">
            <SidebarIcon name={getAdminGroupIcon(group)} />
          </span>
          <span className="app-sidebar-navitem__text truncate">
            {GROUP_LABELS[group]}
          </span>
          <span
            className={`app-sidebar-navitem__caret text-xs ${
              expanded ? "rotate-90" : "group-hover/sidebar-section:rotate-90"
            }`}
            aria-hidden="true"
          >
            &gt;
          </span>
        </button>
        <div
          className={`app-sidebar-group__content rounded-[1.05rem] p-2 ${
            expanded
              ? "app-sidebar-group__panel block"
              : !compact
                ? "app-sidebar-group__panel hidden group-hover/sidebar-section:block"
                : "hidden"
          }`}
        >
          <div className="flex flex-col gap-2 text-sm">{pages.map(renderPageLink)}</div>
        </div>
      </div>
    );
  }

  return (
    <aside
      className="app-dashboard-sidebar"
      data-sidebar-kind="admin"
      data-collapsed={collapsed}
      data-compact={compact}
      data-hovered={hovered}
      onMouseEnter={handlePointerEnter}
      onMouseLeave={handlePointerLeave}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
    >
      <div className="app-dashboard-sidebar__inner text-white">
        <nav className="app-sidebar-nav mt-3 flex flex-col gap-1.5 text-sm font-semibold">
          {renderGroup("core")}
          {renderGroup("client")}
          {renderGroup("hr")}
          {renderGroup("compliance")}
          {renderGroup("ops")}
          {renderGroup("audit")}
          {renderGroup("chat")}
        </nav>
      </div>
    </aside>
  );
}
