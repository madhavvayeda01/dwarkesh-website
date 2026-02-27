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
  const modules = [
    { name: "Employee Data", href: "/client/employees" },
    { name: "Payroll", href: "/client/payroll" },
    { name: "Payroll Data", href: "/client/payroll-data" },
    { name: "IN-OUT", href: "/client/in-out" },
    { name: "PF Challan", href: "/client/pf-challan" },
    { name: "ESIC Challan", href: "/client/esic-challan" },
    { name: "Audit Dashboard", href: "/client/audit" },
    { name: "Training", href: "/client/training" },
    { name: "Committees", href: "/client/committees" },
    { name: "Client Connect", href: "/client/chat" },
  ];

  useEffect(() => {
    async function checkClient() {
      const res = await fetch("/api/client/me");
      const data = await res.json();
      const loggedIn = data?.data?.loggedIn ?? data?.loggedIn ?? false;

      if (!loggedIn) {
        window.location.href = "/signin";
        return;
      }

      setClient(data?.data?.client ?? data?.client);
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
      <div className="flex min-h-screen bg-slate-100">
        <ClientSidebar />
        <main className="flex-1 p-8">
          <div className="mx-auto max-w-6xl animate-pulse space-y-4 rounded-3xl bg-white p-6 shadow-md">
            <div className="h-10 w-72 rounded bg-slate-200" />
            <div className="h-5 w-96 rounded bg-slate-200" />
            <div className="grid gap-3 md:grid-cols-3">
              <div className="h-20 rounded-2xl bg-slate-200" />
              <div className="h-20 rounded-2xl bg-slate-200" />
              <div className="h-20 rounded-2xl bg-slate-200" />
            </div>
          </div>
        </main>
      </div>
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
                Company Name:{" "}
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

          <div className="mt-8 rounded-3xl bg-white p-6 shadow-md">
            <h2 className="text-xl font-bold text-blue-950">Activated Modules</h2>
            <p className="mt-1 text-sm text-slate-600">
              The following modules are active for{" "}
              <span className="font-semibold text-blue-900">{client?.name}</span>.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              {modules.map((module) => (
                <a
                  key={module.name}
                  href={module.href}
                  className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-950 hover:bg-blue-200"
                >
                  {module.name}
                </a>
              ))}
            </div>
          </div>

        </section>
      </main>
    </div>
  );
}
