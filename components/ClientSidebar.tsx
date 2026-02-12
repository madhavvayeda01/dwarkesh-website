"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ClientSidebar() {
  const pathname = usePathname();

  const linkClass = (path: string) =>
    `block rounded-xl px-4 py-3 font-semibold transition ${
      pathname === path
        ? "bg-yellow-500 text-blue-950"
        : "bg-white/10 text-white hover:bg-white/20"
    }`;

  return (
    <aside className="w-72 shrink-0 bg-blue-950 p-6 text-white">
      <h2 className="text-2xl font-extrabold">Client Panel</h2>
      <p className="mt-1 text-sm text-white/70">Dwarkesh Consultancy</p>

      <nav className="mt-8 flex flex-col gap-3">
        <Link href="/client-dashboard" className={linkClass("/client-dashboard")}>
          🏠 Dashboard
        </Link>

        <Link href="/client/employees" className={linkClass("/client/employees")}>
          👥 Employee Master
        </Link>

        <Link href="/client/documents" className={linkClass("/client/documents")}>
          📄 Documents
        </Link>

        <Link href="/client/payroll" className={linkClass("/client/payroll")}>
          💰 Payroll
        </Link>

        <Link href="/client/audit" className={linkClass("/client/audit")}>
          ✅ Audit Module
        </Link>

        <Link href="/client/training" className={linkClass("/client/training")}>
          📅 Training Calendar
        </Link>
      </nav>
    </aside>
  );
}
