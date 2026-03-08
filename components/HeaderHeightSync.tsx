"use client";

import { useEffect } from "react";

export default function HeaderHeightSync() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-app-header]");
    if (!header) return;

    const root = document.documentElement;

    const syncHeight = () => {
      root.style.setProperty("--app-header-height", `${header.offsetHeight}px`);
    };

    syncHeight();

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => syncHeight());

    resizeObserver?.observe(header);
    window.addEventListener("resize", syncHeight);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", syncHeight);
    };
  }, []);

  return null;
}
