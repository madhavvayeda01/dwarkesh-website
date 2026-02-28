"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  findAdminPageKeyByPath,
  getFirstAccessibleAdminRoute,
  type AdminPageAccessMap,
  type AdminPageKey,
} from "@/lib/admin-config";

type AdminMePayload = {
  loggedIn?: boolean;
  allowedPages?: AdminPageAccessMap;
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [denied, setDenied] = useState(false);
  const [fallbackHref, setFallbackHref] = useState("/signin");

  const currentPageKey = useMemo<AdminPageKey | null>(
    () => findAdminPageKeyByPath(pathname),
    [pathname]
  );

  useEffect(() => {
    let cancelled = false;

    async function validateAccess() {
      const res = await fetch("/api/admin/me", { cache: "no-store" });
      const raw = (await res.json().catch(() => ({}))) as { data?: AdminMePayload } & AdminMePayload;
      const payload = raw.data ?? raw;
      const loggedIn = payload.loggedIn ?? false;

      if (!loggedIn) {
        window.location.assign("/signin");
        return;
      }

      const allowedPages = payload.allowedPages;
      if (!cancelled && allowedPages) {
        setFallbackHref(getFirstAccessibleAdminRoute(allowedPages));
      }

      if (currentPageKey && allowedPages && allowedPages[currentPageKey] === false) {
        if (!cancelled) {
          setDenied(true);
          setChecking(false);
        }
        return;
      }

      if (!cancelled) {
        setDenied(false);
        setChecking(false);
      }
    }

    void validateAccess();

    return () => {
      cancelled = true;
    };
  }, [currentPageKey, pathname]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-700">
        Checking admin access...
      </div>
    );
  }

  if (denied) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
        <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-8 text-slate-900 shadow-md">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Access Restricted
          </p>
          <h1 className="mt-3 text-3xl font-black text-blue-950">This admin page is disabled</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Your consultant account does not currently have permission to open this page.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.location.assign(fallbackHref)}
              className="rounded-2xl bg-blue-900 px-5 py-3 font-bold text-white hover:bg-blue-800"
            >
              Go to Allowed Page
            </button>
            <button
              type="button"
              onClick={() => window.location.assign("/signin")}
              className="rounded-2xl border border-slate-300 px-5 py-3 font-bold text-slate-800 hover:bg-slate-50"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
