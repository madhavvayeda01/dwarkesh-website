import "./globals.css";
import AdminNavLink from "@/components/AdminNavLink";
import PrimaryNavLinks from "@/components/PrimaryNavLinks";

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
    <html lang="en">
      <body className="bg-slate-100">
        {/* GLOBAL HEADER */}
        <header className="bg-blue-900 text-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
            {/* Brand */}
            <a href="/" className="flex items-center gap-3">
  <img
    src="/logo.jpg"
    alt="Dwarkesh Consultancy Logo"
    className="h-10 w-10 rounded-full object-cover border border-white/30"
  />
  <span className="text-xl font-bold tracking-wide">
    Dwarkesh Consultancy
  </span>
</a>


            {/* Menu */}
            <nav className="flex flex-wrap items-center gap-2 text-sm">
              <PrimaryNavLinks />

              <a
                href="/signin"
                className="rounded-xl bg-yellow-500 px-4 py-2 font-semibold text-blue-950 hover:bg-yellow-400"
              >
                Sign In
              </a>

              {/* ✅ Admin link will show ONLY if logged in */}
              <AdminNavLink />
            </nav>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="min-h-screen bg-slate-100">{children}</main>

        {/* GLOBAL FOOTER */}
        <footer className="bg-blue-950 text-white">
          <div className="mx-auto max-w-6xl px-6 py-8 text-sm">
            <p className="font-semibold">Dwarkesh Consultancy</p>

            <p className="mt-2 text-white/80">
              Email: dwarkeshconsultancyahmedabad@gmail.com | Contact: +91
              6353025552
            </p>

            <p className="mt-2 text-white/60">
              © {new Date().getFullYear()} Dwarkesh Consultancy. All rights
              reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
