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
        className="app-header-control"
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
        className="app-header-control"
      >
        Vision & Mission
      </Link>

      <Link
        href="/services"
        className="app-header-control"
      >
        Products & Services
      </Link>

      <Link
        href="/business-partners"
        className="app-header-control"
      >
        Business Partners
      </Link>

      <Link
        href="/enquire-now"
        className="app-header-control app-header-control--accent"
      >
        Enquire Now
      </Link>

      <Link
        href="/book-consultation"
        className="app-header-control"
      >
        Book Consultation
      </Link>
    </>
  );
}
