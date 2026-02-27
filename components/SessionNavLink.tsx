"use client";

import { useEffect, useState } from "react";

type SessionState = {
  loggedIn: boolean;
  role: "admin" | "client" | null;
};

export default function SessionNavLink() {
  const [session, setSession] = useState<SessionState>({ loggedIn: false, role: null });

  useEffect(() => {
    async function loadSession() {
      try {
        const [adminRes, clientRes] = await Promise.all([
          fetch("/api/admin/me", { cache: "no-store" }),
          fetch("/api/client/me", { cache: "no-store" }),
        ]);
        const adminData = await adminRes.json();
        const clientData = await clientRes.json();
        const isAdmin = adminData?.data?.loggedIn ?? adminData?.loggedIn ?? false;
        const isClient = clientData?.data?.loggedIn ?? clientData?.loggedIn ?? false;

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
        setSession({ loggedIn: false, role: null });
      }
    }

    loadSession();
  }, []);

  if (session.loggedIn && session.role === "client") {
    return (
      <a
        href="/client-dashboard"
        className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 font-semibold text-white transition hover:bg-white/20"
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
      className="rounded-lg bg-amber-400 px-4 py-2 font-semibold text-slate-900 shadow-sm transition hover:bg-amber-300"
    >
      Sign In
    </a>
  );
}
