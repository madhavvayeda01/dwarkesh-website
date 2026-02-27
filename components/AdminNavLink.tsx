"use client";

import { useEffect, useState } from "react";

export default function AdminNavLink() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/admin/me", { cache: "no-store" });
        const data = await res.json();
        const loggedIn = data?.data?.loggedIn ?? data?.loggedIn ?? false;

        setShow(!!loggedIn);
      } catch {
        setShow(false);
      }
    }

    check();
  }, []);

  if (!show) return null;

  return (
    <a
      className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 font-semibold text-white transition hover:bg-white/20"
      href="/admin"
    >
      Admin
    </a>
  );
}
