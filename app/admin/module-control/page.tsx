"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  CLIENT_PAGE_DEFINITIONS,
  MODULE_KEYS,
  MODULE_LABELS,
  type ClientPageKey,
  type ModuleKey,
} from "@/lib/module-config";

type ClientItem = {
  id: string;
  name: string;
  email: string;
};

type ModuleMap = Record<ModuleKey, boolean>;
type PageMap = Record<ClientPageKey, boolean>;

const MODULE_ORDER: ModuleKey[] = [...MODULE_KEYS];

export default function AdminModuleControlPage() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [clientId, setClientId] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [modules, setModules] = useState<ModuleMap | null>(null);
  const [pages, setPages] = useState<PageMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string>("");
  const [switchingClient, setSwitchingClient] = useState(false);
  const [status, setStatus] = useState("");

  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter((client) => {
      const name = client.name.toLowerCase();
      const email = client.email.toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [clients, clientSearch]);

  const selectedClient = useMemo(() => {
    return clients.find((client) => client.id === clientId) || null;
  }, [clients, clientId]);

  const moduleSections = useMemo(() => {
    return MODULE_ORDER.map((moduleKey) => ({
      moduleKey,
      label: MODULE_LABELS[moduleKey],
      pages: CLIENT_PAGE_DEFINITIONS.filter((page) => page.module === moduleKey),
    })).filter((section) => section.pages.length > 0 || section.moduleKey === "notifications");
  }, []);

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

    async function loadClientAccess() {
      setModules(null);
      setPages(null);
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
      setPages(payload.pages || null);
      setStatus("");
    }

    loadClientAccess();
  }, [clientId]);

  async function saveModule(module: ModuleKey, enabled: boolean) {
    if (!clientId || !modules) return;
    const previous = modules[module];
    setModules({ ...modules, [module]: enabled });
    setSavingKey(`module:${module}`);

    const res = await fetch("/api/admin/module-control", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        modules: { [module]: enabled },
      }),
    });
    const data = await res.json();
    const payload = data?.data ?? data;

    if (!res.ok) {
      setModules({ ...modules, [module]: previous });
      setStatus(data?.message || "Failed to update module.");
      setSavingKey("");
      return;
    }

    setModules(payload.modules || null);
    setPages(payload.pages || null);
    setStatus("Module access updated.");
    setSavingKey("");
  }

  async function savePage(pageKey: ClientPageKey, enabled: boolean) {
    if (!clientId || !pages) return;
    const previous = pages[pageKey];
    setPages({ ...pages, [pageKey]: enabled });
    setSavingKey(`page:${pageKey}`);

    const res = await fetch("/api/admin/module-control", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        pages: { [pageKey]: enabled },
      }),
    });
    const data = await res.json();
    const payload = data?.data ?? data;

    if (!res.ok) {
      setPages({ ...pages, [pageKey]: previous });
      setStatus(data?.message || "Failed to update page access.");
      setSavingKey("");
      return;
    }

    setModules(payload.modules || null);
    setPages(payload.pages || null);
    setStatus("Page access updated.");
    setSavingKey("");
  }

  async function loginAsSelectedClient() {
    if (!clientId) return;
    setSwitchingClient(true);
    setStatus("Switching to selected client account...");
    const res = await fetch("/api/admin/impersonate-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data?.message || "Failed to switch client account.");
      setSwitchingClient(false);
      return;
    }
    const payload = data?.data ?? data;
    window.location.href = payload?.redirectTo || "/client-dashboard";
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <main className="flex-1 p-8 text-slate-900">
        <h1 className="text-3xl font-extrabold text-blue-950">Module Control</h1>
        <p className="mt-2 text-slate-600">
          Control exactly which client pages appear in the sidebar and remain accessible by route.
        </p>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          {loading ? (
            <p className="text-sm text-slate-600">Loading clients...</p>
          ) : clients.length === 0 ? (
            <p className="text-sm text-slate-600">No clients found.</p>
          ) : (
            <>
              <label className="text-sm font-semibold text-slate-700">Search Client</label>
              <input
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Search by client name or email..."
                className="mt-2 w-full max-w-lg rounded-xl border bg-white px-4 py-3 text-slate-900"
              />

              <label className="mt-4 block text-sm font-semibold text-slate-700">Select Client</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="mt-2 w-full max-w-lg rounded-xl border bg-white px-4 py-3 text-slate-900"
              >
                {filteredClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.email})
                  </option>
                ))}
              </select>

              {filteredClients.length === 0 && (
                <p className="mt-2 text-xs text-slate-500">No client matched your search.</p>
              )}

              {selectedClient && (
                <p className="mt-3 text-sm text-slate-600">
                  Managing access for:{" "}
                  <span className="font-semibold text-blue-900">{selectedClient.name}</span>
                </p>
              )}

              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-blue-950">Always visible:</p>
                <p className="mt-1">
                  The client dashboard stays available. All feature pages listed below can be hidden
                  from the sidebar and blocked by direct URL access.
                </p>
              </div>

              <button
                type="button"
                onClick={loginAsSelectedClient}
                disabled={!clientId || switchingClient}
                className="mt-4 rounded-xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {switchingClient ? "Switching..." : "Login As Selected Client"}
              </button>
            </>
          )}
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-bold text-blue-950">Allotted Client Pages</h2>
          {!clientId ? (
            <p className="mt-3 text-sm text-slate-600">Select a client first.</p>
          ) : !modules || !pages ? (
            <p className="mt-3 text-sm text-slate-600">Loading access settings...</p>
          ) : (
            <div className="mt-5 space-y-5">
              {moduleSections.map((section) => {
                const moduleEnabled = modules[section.moduleKey];
                return (
                  <section
                    key={section.moduleKey}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                          Module
                        </p>
                        <h3 className="mt-2 text-xl font-black text-slate-900">
                          {section.label}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          When a module is disabled, every page under it becomes inaccessible even
                          if the page toggle is enabled.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => saveModule(section.moduleKey, !moduleEnabled)}
                        disabled={savingKey.startsWith("module:")}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                          moduleEnabled
                            ? "bg-green-600 text-white hover:bg-green-500"
                            : "bg-slate-300 text-slate-800 hover:bg-slate-200"
                        } disabled:opacity-50`}
                      >
                        {savingKey === `module:${section.moduleKey}`
                          ? "Saving..."
                          : moduleEnabled
                          ? "Module Enabled"
                          : "Module Disabled"}
                      </button>
                    </div>

                    {section.pages.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {section.pages.map((page) => (
                          <div
                            key={page.key}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <p className="font-semibold text-slate-900">{page.label}</p>
                                <p className="mt-1 text-xs text-slate-500">{page.href}</p>
                                {!moduleEnabled && (
                                  <p className="mt-2 text-xs font-semibold text-amber-700">
                                    Hidden because the parent module is disabled.
                                  </p>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => savePage(page.key, !pages[page.key])}
                                disabled={savingKey.startsWith("page:")}
                                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                                  pages[page.key]
                                    ? "bg-blue-900 text-white hover:bg-blue-800"
                                    : "bg-slate-300 text-slate-800 hover:bg-slate-200"
                                } disabled:opacity-50`}
                              >
                                {savingKey === `page:${page.key}`
                                  ? "Saving..."
                                  : pages[page.key]
                                  ? "Page Enabled"
                                  : "Page Disabled"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-600">
                        No direct client page is mapped to this module yet.
                      </p>
                    )}
                  </section>
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
