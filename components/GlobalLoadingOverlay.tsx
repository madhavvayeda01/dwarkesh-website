"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BrandedLoader from "@/components/BrandedLoader";

const SHOW_DELAY_MS = 350;
const MIN_VISIBLE_MS = 420;
const NAVIGATION_TIMEOUT_MS = 15000;

function isInternalNavigationAnchor(
  target: EventTarget | null
): HTMLAnchorElement | null {
  if (!(target instanceof Element)) return null;
  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return null;

  const href = anchor.getAttribute("href") || "";
  if (!href || href.startsWith("#")) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;
  return anchor;
}

function normalizeRoute(pathname: string, search: string) {
  return search ? `${pathname}?${search}` : pathname;
}

export default function GlobalLoadingOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentRoute = useMemo(
    () => normalizeRoute(pathname || "/", searchParams?.toString() || ""),
    [pathname, searchParams]
  );

  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("Opening page");
  const [subtitle, setSubtitle] = useState(
    "Preparing navigation, layout, and page data."
  );

  const navigationPendingRef = useRef(false);
  const visibleRef = useRef(false);
  const visibleSinceRef = useRef(0);
  const previousRouteRef = useRef(currentRoute);

  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const clearNavigationTimeout = useCallback(() => {
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
  }, []);

  const scheduleShow = useCallback(() => {
    if (visibleRef.current || showTimerRef.current) return;
    showTimerRef.current = setTimeout(() => {
      showTimerRef.current = null;
      if (!navigationPendingRef.current) return;

      setTitle("Opening page");
      setSubtitle("Loading route, layout, and module access.");
      visibleSinceRef.current = Date.now();
      setVisible(true);
    }, SHOW_DELAY_MS);
  }, []);

  const hideIfIdle = useCallback(() => {
    if (navigationPendingRef.current) return;
    clearShowTimer();
    if (!visibleRef.current) return;
    clearHideTimer();
    const elapsed = Date.now() - visibleSinceRef.current;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      setVisible(false);
    }, remaining);
  }, [clearHideTimer, clearShowTimer]);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    function startNavigationLoader() {
      navigationPendingRef.current = true;
      clearNavigationTimeout();
      navigationTimeoutRef.current = setTimeout(() => {
        navigationPendingRef.current = false;
        hideIfIdle();
      }, NAVIGATION_TIMEOUT_MS);
      scheduleShow();
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = isInternalNavigationAnchor(event.target);
      if (!anchor) return;

      const url = new URL(anchor.href, window.location.origin);
      if (url.origin !== window.location.origin) return;
      const targetRoute = normalizeRoute(url.pathname, url.search.slice(1));
      const current = normalizeRoute(window.location.pathname, window.location.search.slice(1));
      if (targetRoute === current) return;

      startNavigationLoader();
    }

    function onPopState() {
      startNavigationLoader();
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [clearNavigationTimeout, hideIfIdle, scheduleShow]);

  useEffect(() => {
    if (previousRouteRef.current === currentRoute) return;
    previousRouteRef.current = currentRoute;
    navigationPendingRef.current = false;
    clearNavigationTimeout();
    hideIfIdle();
  }, [currentRoute, clearNavigationTimeout, hideIfIdle]);

  useEffect(
    () => () => {
      clearShowTimer();
      clearHideTimer();
      clearNavigationTimeout();
    },
    [clearHideTimer, clearNavigationTimeout, clearShowTimer]
  );

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[120] bg-slate-950/35 backdrop-blur-[1.5px]">
      <div className="mx-auto mt-[calc(var(--app-header-height)+18px)] w-[min(920px,calc(100%-1.5rem))]">
        <BrandedLoader compact title={title} subtitle={subtitle} />
      </div>
    </div>
  );
}
