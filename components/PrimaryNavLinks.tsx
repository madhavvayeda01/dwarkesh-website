"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PrimaryNavLinks() {
  const pathname = usePathname();
  const isClientRoute = pathname.startsWith("/client");
  const isAdminRoute = pathname.startsWith("/admin");
  const isPanelRoute = isAdminRoute || isClientRoute;

  if (isClientRoute) {
    return (
      <Link
        href="/client-dashboard"
        className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 font-semibold text-white transition hover:bg-white/20"
      >
        Home
      </Link>
    );
  }

  if (isPanelRoute) return null;

  return (
    <>
      <Link
        href="/vision-mission"
        className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 font-semibold text-white transition hover:bg-white/20"
      >
        Vision & Mission
      </Link>

      <Link
        href="/services"
        className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 font-semibold text-white transition hover:bg-white/20"
      >
        Products & Services
      </Link>

      <Link
        href="/business-partners"
        className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 font-semibold text-white transition hover:bg-white/20"
      >
        Business Partners
      </Link>

      <Link
        href="/enquire-now"
        className="rounded-lg bg-amber-400 px-4 py-2 font-semibold text-slate-900 shadow-sm transition hover:bg-amber-300"
      >
        Enquire Now
      </Link>

      <Link
        href="/book-consultation"
        className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 font-semibold text-white transition hover:bg-white/20"
      >
        Book Consultation
      </Link>
    </>
  );
}
