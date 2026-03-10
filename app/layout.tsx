/* eslint-disable @next/next/no-img-element */
import "./globals.css";
import Link from "next/link";
import type { Metadata, Viewport } from "next";
import AdminNavLink from "@/components/AdminNavLink";
import DashboardSidebarTrigger from "@/components/DashboardSidebarTrigger";
import HeaderHeightSync from "@/components/HeaderHeightSync";
import NotificationBell from "@/components/NotificationBell";
import PrimaryNavLinks from "@/components/PrimaryNavLinks";
import SessionNavLink from "@/components/SessionNavLink";
import ThemeToggle from "@/components/ThemeToggle";
import GlobalLoadingOverlay from "@/components/GlobalLoadingOverlay";

export const metadata: Metadata = {
  title: "Dwarkesh Consultancy",
  description: "Compliance Made Simple.",
  icons: {
    icon: [
      { url: "/logo.jpg", type: "image/jpeg" },
      { url: "/icon.jpg", type: "image/jpeg" },
    ],
    shortcut: ["/logo.jpg"],
    apple: ["/apple-icon.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-100 text-slate-900" suppressHydrationWarning>
        <HeaderHeightSync />
        <GlobalLoadingOverlay />
        <header
          data-app-header
          className="app-shell-header fixed inset-x-0 top-0 z-[80] text-white"
          style={{ minHeight: "var(--app-header-height)" }}
        >
          <div className="mx-auto max-w-7xl px-4 py-2.5">
            <div className="app-shell-header__row">
              <div className="app-shell-header__left">
                <DashboardSidebarTrigger />
                <Link href="/" className="app-shell-brand">
                  <img
                    src="/logo.jpg"
                    alt="Dwarkesh Consultancy Logo"
                    className="app-shell-brand__logo"
                  />
                  <span className="app-shell-brand__title">Dwarkesh Consultancy</span>
                </Link>
              </div>

              <nav className="app-shell-actions">
                <PrimaryNavLinks />
                <ThemeToggle />
                <NotificationBell />
                <SessionNavLink />
                <AdminNavLink />
              </nav>
            </div>
          </div>
        </header>

        <main className="min-h-screen bg-slate-100 pt-[var(--app-header-height)]">
          {children}
        </main>

        <footer className="bg-blue-950 text-white">
          <div className="mx-auto max-w-6xl px-6 py-8 text-sm">
            <p className="font-semibold">Dwarkesh Consultancy</p>
            <p className="mt-2 text-white/80">
              Email: dwarkeshconsultancyahmedabad@gmail.com | Contact: +91 6353025552
            </p>
            <p className="mt-2 text-white/60">
              Copyright {new Date().getFullYear()} Dwarkesh Consultancy. All rights reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

