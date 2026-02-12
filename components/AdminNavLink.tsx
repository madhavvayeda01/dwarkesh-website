"use client";

import { useEffect, useState } from "react";

export default function AdminNavLink() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/admin/me", { cache: "no-store" });
        const data = await res.json();

        setShow(!!data.loggedIn);
      } catch (e) {
        setShow(false);
      }
    }

    check();
  }, []);

  if (!show) return null;

  return (
    <a className="hover:text-yellow-300" href="/admin">
      Admin
    </a>
  );
}
