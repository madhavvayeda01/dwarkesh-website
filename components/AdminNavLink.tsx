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
      className="app-header-control"
      href="/admin"
    >
      Admin
    </a>
  );
}
