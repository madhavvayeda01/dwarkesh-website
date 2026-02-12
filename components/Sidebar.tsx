"use client";

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-blue-950 text-white p-6">
      <h2 className="text-xl font-bold">Admin Panel</h2>
      <p className="mt-2 text-sm text-white/70">Logged in as admin</p>

      <nav className="mt-6 flex flex-col gap-3 text-sm font-semibold">
        <a
          href="/admin"
          className="rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20"
        >
          📩 Enquiries
        </a>

        <a
          href="/admin/clients"
          className="rounded-xl bg-yellow-500 px-4 py-2 text-blue-950 hover:bg-yellow-400"
        >
          ➕ Client Onboarding
        </a>
        <a
  href="/admin/document-allotment"
  className="rounded-xl bg-white/10 px-4 py-2 font-semibold hover:bg-white/20"
>
  📁 Document Allotment
</a>


      </nav>
    </aside>
  );
}
