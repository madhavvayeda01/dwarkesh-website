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
        className="rounded-xl bg-white/10 px-4 py-2 font-semibold hover:bg-white/20"
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
        className="rounded-xl bg-white/10 px-4 py-2 font-semibold hover:bg-white/20"
      >
        Vision & Mission
      </Link>

      <Link
        href="/services"
        className="rounded-xl bg-white/10 px-4 py-2 font-semibold hover:bg-white/20"
      >
        Products & Services
      </Link>

      <Link
        href="/business-partners"
        className="rounded-xl bg-white/10 px-4 py-2 font-semibold hover:bg-white/20"
      >
        Business Partners
      </Link>

      <Link
        href="/enquire-now"
        className="rounded-xl bg-yellow-500 px-4 py-2 font-semibold text-blue-950 hover:bg-yellow-400"
      >
        Enquire Now
      </Link>

      <Link
        href="/book-consultation"
        className="rounded-xl bg-white/10 px-4 py-2 font-semibold hover:bg-white/20"
      >
        Book Consultation
      </Link>
    </>
  );
}
