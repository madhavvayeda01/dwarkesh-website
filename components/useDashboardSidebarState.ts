"use client";

import type { FocusEvent } from "react";
import { useEffect, useMemo, useSyncExternalStore } from "react";

type UseDashboardSidebarStateOptions = {
  storageKey: string;
};

type HoverRegion = "sidebar" | "trigger";

type SidebarSnapshot = {
  collapsed: boolean;
  focusWithin: boolean;
  hoverPreviewArmed: boolean;
  hoverRegions: Record<HoverRegion, boolean>;
  lingerVisible: boolean;
  ready: boolean;
};

type SidebarStore = {
  closeTimer: ReturnType<typeof setTimeout> | null;
  hydrated: boolean;
  listeners: Set<() => void>;
  snapshot: SidebarSnapshot;
};

const DEFAULT_SNAPSHOT: SidebarSnapshot = {
  collapsed: false,
  focusWithin: false,
  hoverPreviewArmed: true,
  hoverRegions: {
    sidebar: false,
    trigger: false,
  },
  lingerVisible: false,
  ready: false,
};

const stores = new Map<string, SidebarStore>();

function getStore(storageKey: string) {
  let store = stores.get(storageKey);
  if (!store) {
    store = {
      closeTimer: null,
      hydrated: false,
      listeners: new Set(),
      snapshot: DEFAULT_SNAPSHOT,
    };
    stores.set(storageKey, store);
  }
  return store;
}

function emit(storageKey: string) {
  const store = getStore(storageKey);
  store.listeners.forEach((listener) => listener());
}

function setSnapshot(
  storageKey: string,
  updater: SidebarSnapshot | ((current: SidebarSnapshot) => SidebarSnapshot)
) {
  const store = getStore(storageKey);
  const next =
    typeof updater === "function"
      ? (updater as (current: SidebarSnapshot) => SidebarSnapshot)(store.snapshot)
      : updater;

  store.snapshot = next;
  emit(storageKey);
}

function clearCloseTimer(storageKey: string) {
  const store = getStore(storageKey);
  if (store.closeTimer) {
    clearTimeout(store.closeTimer);
    store.closeTimer = null;
  }
}

function schedulePreviewClose(storageKey: string) {
  const store = getStore(storageKey);
  clearCloseTimer(storageKey);
  store.closeTimer = setTimeout(() => {
    setSnapshot(storageKey, (current) => ({
      ...current,
      hoverPreviewArmed: true,
      lingerVisible: false,
    }));
    store.closeTimer = null;
  }, 140);
}

export function resetDashboardSidebarTransientState(storageKey: string) {
  clearCloseTimer(storageKey);
  setSnapshot(storageKey, (current) => ({
    ...current,
    focusWithin: false,
    hoverPreviewArmed: true,
    hoverRegions: {
      sidebar: false,
      trigger: false,
    },
    lingerVisible: false,
  }));
}

function syncSidebarOffset(collapsed: boolean) {
  document.documentElement.style.setProperty(
    "--app-sidebar-offset",
    collapsed ? "0px" : "var(--app-sidebar-expanded-width)"
  );
}

export function useDashboardSidebarState({
  storageKey,
}: UseDashboardSidebarStateOptions) {
  const snapshot = useSyncExternalStore(
    (listener) => {
      const store = getStore(storageKey);
      store.listeners.add(listener);

      return () => {
        store.listeners.delete(listener);
      };
    },
    () => getStore(storageKey).snapshot,
    () => DEFAULT_SNAPSHOT
  );

  useEffect(() => {
    const store = getStore(storageKey);
    if (store.hydrated) return;

    store.hydrated = true;

    let collapsed = false;
    try {
      collapsed = window.localStorage.getItem(storageKey) === "collapsed";
    } catch {
      collapsed = false;
    }

    setSnapshot(storageKey, {
      ...DEFAULT_SNAPSHOT,
      collapsed,
      ready: true,
    });
    syncSidebarOffset(collapsed);
  }, [storageKey]);

  useEffect(() => {
    if (!snapshot.ready) return;

    try {
      window.localStorage.setItem(storageKey, snapshot.collapsed ? "collapsed" : "expanded");
    } catch {
      // Ignore storage write issues and keep runtime state only.
    }

    syncSidebarOffset(snapshot.collapsed);

    return () => {
      document.documentElement.style.removeProperty("--app-sidebar-offset");
    };
  }, [snapshot.collapsed, snapshot.ready, storageKey]);

  const hovered = useMemo(
    () =>
      snapshot.collapsed &&
      snapshot.hoverPreviewArmed &&
      (snapshot.lingerVisible || snapshot.focusWithin),
    [snapshot.collapsed, snapshot.focusWithin, snapshot.hoverPreviewArmed, snapshot.lingerVisible]
  );

  const compact = useMemo(() => snapshot.collapsed && !hovered, [snapshot.collapsed, hovered]);

  function activateRegion(region: HoverRegion) {
    clearCloseTimer(storageKey);
    setSnapshot(storageKey, (current) => {
      if (current.collapsed && !current.hoverPreviewArmed) {
        return current;
      }

      return {
        ...current,
        hoverRegions: {
          ...current.hoverRegions,
          [region]: true,
        },
        lingerVisible: true,
      };
    });
  }

  function deactivateRegion(region: HoverRegion) {
    setSnapshot(storageKey, (current) => ({
      ...current,
      hoverRegions: {
        ...current.hoverRegions,
        [region]: false,
      },
    }));

    const next = getStore(storageKey).snapshot;
    const hasHover = next.hoverRegions.sidebar || next.hoverRegions.trigger;
    if (!hasHover && !next.focusWithin && next.collapsed) {
      schedulePreviewClose(storageKey);
    }
  }

  return {
    collapsed: snapshot.collapsed,
    compact,
    hovered,
    handlePointerEnter() {
      activateRegion("sidebar");
    },
    handlePointerLeave() {
      deactivateRegion("sidebar");
    },
    handleTriggerEnter() {
      activateRegion("trigger");
    },
    handleTriggerLeave() {
      deactivateRegion("trigger");
    },
    handleFocusCapture() {
      clearCloseTimer(storageKey);
      setSnapshot(storageKey, (current) => ({
        ...current,
        focusWithin: true,
        lingerVisible: true,
      }));
    },
    handleBlurCapture(event: FocusEvent<HTMLElement>) {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setSnapshot(storageKey, (current) => ({
          ...current,
          focusWithin: false,
        }));

        const next = getStore(storageKey).snapshot;
        const hasHover = next.hoverRegions.sidebar || next.hoverRegions.trigger;
        if (!hasHover && next.collapsed) {
          schedulePreviewClose(storageKey);
        }
      }
    },
    toggleCollapsed() {
      clearCloseTimer(storageKey);
      setSnapshot(storageKey, (current) => {
        const nextCollapsed = !current.collapsed;
        return {
          ...current,
          collapsed: nextCollapsed,
          focusWithin: false,
          hoverPreviewArmed: nextCollapsed ? false : true,
          hoverRegions: {
            sidebar: false,
            trigger: false,
          },
          lingerVisible: false,
        };
      });
    },
  };
}

export function getSidebarAbbreviation(label: string) {
  const words = label
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "•";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}
