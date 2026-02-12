"use client";

import { useEffect, useState } from "react";
import ClientSidebar from "@/components/ClientSidebar";

type Client = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export default function ClientDashboardPage() {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkClient() {
      const res = await fetch("/api/client/me");
      const data = await res.json();

      if (!data.loggedIn) {
        window.location.href = "/signin";
        return;
      }

      setClient(data.client);
      setLoading(false);
    }

    checkClient();
  }, []);

  async function logout() {
    await fetch("/api/client/logout", { method: "POST" });
    window.location.href = "/signin";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-700 font-semibold">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar */}
      <ClientSidebar />

      {/* Main */}
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-blue-950 md:text-4xl">
                Client Dashboard
              </h1>

              <p className="mt-2 text-slate-600">
                Logged in as client:{" "}
                <span className="font-semibold text-blue-900">
                  {client?.name}
                </span>{" "}
                ({client?.email})
              </p>
            </div>

            <button
              onClick={logout}
              className="rounded-2xl bg-red-500 px-5 py-2 font-semibold text-white hover:bg-red-400"
            >
              Logout
            </button>
          </div>

          {/* Cards */}
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl bg-white p-6 shadow-md">
              <h2 className="text-lg font-bold text-blue-950">Documents</h2>
              <p className="mt-2 text-sm text-slate-600">
                Upload and manage compliance documents.
              </p>
              <p className="mt-4 text-xs font-semibold text-slate-500">
                Coming soon
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-md">
              <h2 className="text-lg font-bold text-blue-950">Payroll</h2>
              <p className="mt-2 text-sm text-slate-600">
                Payroll & payslip support module.
              </p>
              <p className="mt-4 text-xs font-semibold text-slate-500">
                Coming soon
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-md">
              <h2 className="text-lg font-bold text-blue-950">Audit Module</h2>
              <p className="mt-2 text-sm text-slate-600">
                Audit checklist + findings tracking.
              </p>
              <p className="mt-4 text-xs font-semibold text-slate-500">
                Coming soon
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
