"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { SidebarIcon } from "@/components/sidebar-icons";
import {
  resetDashboardSidebarTransientState,
  useDashboardSidebarState,
} from "@/components/useDashboardSidebarState";

function getSidebarStorageKey(pathname: string) {
  if (pathname.startsWith("/admin")) {
    return "dwarkesh_admin_sidebar_state";
  }

  if (pathname === "/client-dashboard" || pathname.startsWith("/client")) {
    return "dwarkesh_client_sidebar_state";
  }

  return null;
}

export default function DashboardSidebarTrigger() {
  const pathname = usePathname();
  const storageKey = getSidebarStorageKey(pathname);
  const resolvedStorageKey = storageKey ?? "__inactive_sidebar_state__";

  const {
    collapsed,
    handleTriggerEnter,
    handleTriggerLeave,
    toggleCollapsed,
  } = useDashboardSidebarState({ storageKey: resolvedStorageKey });

  useEffect(() => {
    if (!storageKey) return;

    resetDashboardSidebarTransientState(storageKey);

    return () => {
      resetDashboardSidebarTransientState(storageKey);
    };
  }, [pathname, storageKey]);

  if (!storageKey) return null;

  return (
    <button
      type="button"
      className="app-header-control app-header-control--icon app-header-sidebar-trigger"
      onMouseEnter={handleTriggerEnter}
      onMouseLeave={handleTriggerLeave}
      onClick={toggleCollapsed}
      aria-label={collapsed ? "Open sidebar menu" : "Pin sidebar open"}
      title={collapsed ? "Open sidebar menu" : "Collapse sidebar"}
    >
      <SidebarIcon
        name={collapsed ? "chevronRight" : "chevronLeft"}
        className="app-header-control__icon"
      />
    </button>
  );
}
