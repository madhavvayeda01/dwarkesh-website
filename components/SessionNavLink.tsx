"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type SessionState = {
  loggedIn: boolean;
  role: "admin" | "client" | null;
};

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

export default function SessionNavLink() {
  const pathname = usePathname();
  const [session, setSession] = useState<SessionState>({ loggedIn: false, role: null });

  useEffect(() => {
    if (shouldSkipAuthProbe(pathname)) {
      setSession({ loggedIn: false, role: null });
      return;
    }

    let cancelled = false;

    async function loadSession() {
      try {
        const [adminRes, clientRes] = await Promise.all([
          fetch("/api/admin/me", { cache: "no-store" }),
          fetch("/api/client/me", { cache: "no-store" }),
        ]);
        const [adminData, clientData] = await Promise.all([
          readJsonSafe<{ data?: { loggedIn?: boolean }; loggedIn?: boolean }>(adminRes),
          readJsonSafe<{ data?: { loggedIn?: boolean }; loggedIn?: boolean }>(clientRes),
        ]);
        const isAdmin = adminData?.data?.loggedIn ?? adminData?.loggedIn ?? false;
        const isClient = clientData?.data?.loggedIn ?? clientData?.loggedIn ?? false;

        if (cancelled) return;

        if (isAdmin) {
          setSession({ loggedIn: true, role: "admin" });
          return;
        }
        if (isClient) {
          setSession({ loggedIn: true, role: "client" });
          return;
        }
        setSession({ loggedIn: false, role: null });
      } catch {
        if (cancelled) return;
        setSession({ loggedIn: false, role: null });
      }
    }

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (session.loggedIn && session.role === "client") {
    return (
      <a
        href="/client-dashboard"
        className="app-header-control"
      >
        Client Panel
      </a>
    );
  }

  if (session.loggedIn && session.role === "admin") {
    return null;
  }

  return (
    <a
      href="/signin"
      className="app-header-control app-header-control--accent"
    >
      Sign In
    </a>
  );
}
