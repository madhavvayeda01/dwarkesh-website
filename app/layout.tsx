import "./globals.css";
import Link from "next/link";
import AdminNavLink from "@/components/AdminNavLink";
import NotificationBell from "@/components/NotificationBell";
import PrimaryNavLinks from "@/components/PrimaryNavLinks";
import SessionNavLink from "@/components/SessionNavLink";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata = {
  title: "Dwarkesh Consultancy",
  description: "Compliance Made Simple.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-100 text-slate-900" suppressHydrationWarning>
        <header className="sticky top-0 z-40 border-b border-cyan-300/20 bg-[radial-gradient(120%_120%_at_10%_0%,#22388b_0%,#172a76_45%,#0f1f5e_100%)] text-white shadow-[0_8px_24px_rgba(6,12,34,0.35)] backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5">
            <Link
              href="/"
              className="group flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 transition hover:bg-white/15"
            >
              <img
                src="/logo.jpg"
                alt="Dwarkesh Consultancy Logo"
                className="h-10 w-10 rounded-full border border-white/40 object-cover shadow-sm"
              />
              <span className="text-lg font-bold tracking-wide">Dwarkesh Consultancy</span>
            </Link>

            <nav className="flex flex-wrap items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-2 py-1 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
              <PrimaryNavLinks />
              <ThemeToggle />
              <NotificationBell />
              <SessionNavLink />
              <AdminNavLink />
            </nav>
          </div>
        </header>

        <main className="min-h-screen bg-slate-100">{children}</main>

        <footer className="bg-blue-950 text-white">
          <div className="mx-auto max-w-6xl px-6 py-8 text-sm">
            <p className="font-semibold">Dwarkesh Consultancy</p>
            <p className="mt-2 text-white/80">
              Email: dwarkeshconsultancyahmedabad@gmail.com | Contact: +91 6353025552
            </p>
            <p className="mt-2 text-white/60">
              © {new Date().getFullYear()} Dwarkesh Consultancy. All rights reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
