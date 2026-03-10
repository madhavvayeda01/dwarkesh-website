"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

function shouldSkipAuthProbe(pathname: string) {
  return (
    pathname === "/signin" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/reset-password")
  );
}

async function readJsonSafe<T>(res: Response) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export default function AdminNavLink() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (shouldSkipAuthProbe(pathname)) {
      setShow(false);
      return;
    }

    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/admin/me", { cache: "no-store" });
        const data = await readJsonSafe<{ data?: { loggedIn?: boolean }; loggedIn?: boolean }>(res);
        const loggedIn = data?.data?.loggedIn ?? data?.loggedIn ?? false;

        if (cancelled) return;
        setShow(!!loggedIn);
      } catch {
        if (cancelled) return;
        setShow(false);
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!show) return null;

  return (
    <a
      className="app-header-control"
      href="/admin"
    >
      Admin
    </a>
  );
}
