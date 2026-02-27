"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";

type ClientItem = {
  id: string;
  name: string;
  email: string;
};

type ModuleKey =
  | "employees"
  | "payroll"
  | "in_out"
  | "training"
  | "committees"
  | "documents"
  | "audit"
  | "chat"
  | "notifications";

type ModuleMap = Record<ModuleKey, boolean>;

const MODULE_LABELS: Record<ModuleKey, string> = {
  employees: "Employees",
  payroll: "Payroll",
  in_out: "In-Out",
  training: "Training",
  committees: "Committees",
  documents: "Documents",
  audit: "Audit",
  chat: "Chat",
  notifications: "Notifications",
};

const MODULE_ORDER: ModuleKey[] = [
  "employees",
  "payroll",
  "in_out",
  "training",
  "committees",
  "documents",
  "audit",
  "chat",
  "notifications",
];

export default function AdminModuleControlPage() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [clientId, setClientId] = useState("");
  const [modules, setModules] = useState<ModuleMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientId) || null,
    [clients, clientId]
  );

  useEffect(() => {
    async function init() {
      const me = await fetch("/api/admin/me");
      const meData = await me.json();
      const loggedIn = meData?.data?.loggedIn ?? meData?.loggedIn ?? false;
      if (!loggedIn) {
        window.location.href = "/signin";
        return;
      }

      const res = await fetch("/api/admin/module-control", { cache: "no-store" });
      const data = await res.json();
      const payload = data?.data ?? data;
      const list = payload.clients || [];
      setClients(list);
      if (list.length > 0) {
        setClientId(list[0].id);
      } else {
        setStatus("No clients available. Please add clients first.");
      }
      setLoading(false);
    }

    init();
  }, []);

  useEffect(() => {
    if (!clientId) return;
    async function loadClientModules() {
      setModules(null);
      const res = await fetch(`/api/admin/module-control?clientId=${clientId}`, {
        cache: "no-store",
      });
      const data = await res.json();
      const payload = data?.data ?? data;
      if (!res.ok) {
        setStatus(data?.message || "Failed to load module control.");
        return;
      }
      setModules(payload.modules || null);
      setStatus("");
    }
    loadClientModules();
  }, [clientId]);

  async function saveModule(module: ModuleKey, enabled: boolean) {
    if (!clientId || !modules) return;
    const previous = modules[module];
    setModules({ ...modules, [module]: enabled });
    setSaving(true);
    const res = await fetch("/api/admin/module-control", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        modules: { [module]: enabled },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setModules({ ...modules, [module]: previous });
      setStatus(data?.message || "Failed to update module.");
      setSaving(false);
      return;
    }
    setStatus("Module settings updated.");
    setSaving(false);
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <main className="flex-1 p-8 text-slate-900">
        <h1 className="text-3xl font-extrabold text-blue-950">Module Control</h1>
        <p className="mt-2 text-slate-600">
          Enable or disable modules for each client company.
        </p>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          {loading ? (
            <p className="text-sm text-slate-600">Loading clients...</p>
          ) : clients.length === 0 ? (
            <p className="text-sm text-slate-600">No clients found.</p>
          ) : (
            <>
              <label className="text-sm font-semibold text-slate-700">Select Client</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="mt-2 w-full max-w-lg rounded-xl border bg-white px-4 py-3 text-slate-900"
              >
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.email})
                  </option>
                ))}
              </select>

              {selectedClient && (
                <p className="mt-3 text-sm text-slate-600">
                  Managing modules for:{" "}
                  <span className="font-semibold text-blue-900">{selectedClient.name}</span>
                </p>
              )}
            </>
          )}
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-bold text-blue-950">Module Toggles</h2>
          {!clientId ? (
            <p className="mt-3 text-sm text-slate-600">Select a client first.</p>
          ) : !modules ? (
            <p className="mt-3 text-sm text-slate-600">Loading module settings...</p>
          ) : (
            <div className="mt-4 space-y-3">
              {MODULE_ORDER.map((module) => {
                const enabled = modules[module];
                return (
                  <label
                    key={module}
                    className="flex items-center justify-between rounded-xl border bg-slate-50 px-4 py-3"
                  >
                    <span className="font-semibold text-slate-800">{MODULE_LABELS[module]}</span>
                    <button
                      type="button"
                      onClick={() => saveModule(module, !enabled)}
                      disabled={saving}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                        enabled
                          ? "bg-green-600 text-white hover:bg-green-500"
                          : "bg-slate-300 text-slate-800 hover:bg-slate-200"
                      } disabled:opacity-50`}
                    >
                      {enabled ? "Enabled" : "Disabled"}
                    </button>
                  </label>
                );
              })}
            </div>
          )}
          {status && <p className="mt-4 text-sm font-semibold text-slate-700">{status}</p>}
        </div>
      </main>
    </div>
  );
}
