"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";

type ClientRecord = {
  id: string;
  name: string;
  email: string;
  logoUrl?: string | null;
  address?: string | null;
  contactNumber?: string | null;
  createdAt: string;
};

function initials(name: string | null | undefined) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return "CL";
  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminClientsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);
  const [actionClientId, setActionClientId] = useState("");
  const [status, setStatus] = useState("");
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [search, setSearch] = useState("");

  const filteredClients = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return clients;
    return clients.filter((client) =>
      [client.name, client.email, client.contactNumber || "", client.address || ""]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [clients, search]);

  useEffect(() => {
    async function checkLogin() {
      const res = await fetch("/api/admin/me");
      const data = await res.json().catch(() => ({}));
      const loggedIn = data?.data?.loggedIn ?? data?.loggedIn ?? false;
      if (!loggedIn) {
        window.location.href = "/signin";
        return;
      }
      await loadClients();
    }
    checkLogin();
  }, []);

  async function loadClients() {
    setLoadingClients(true);
    const res = await fetch("/api/admin/clients-list", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data?.message || "Failed to load clients.");
      setLoadingClients(false);
      return;
    }

    setClients(data?.data?.clients || []);
    setLoadingClients(false);
  }

  async function handleLogoUpload(file: File) {
    setUploading(true);
    setStatus("Uploading logo...");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/client-logo", {
      method: "POST",
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    const payload = data?.data ?? data;

    if (!res.ok) {
      setStatus(data?.message || "Logo upload failed.");
      setUploading(false);
      return;
    }

    setLogoUrl(payload.logoUrl || "");
    setStatus("Logo uploaded.");
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setStatus("Creating client...");

    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          logoUrl,
          address,
          contactNumber,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data?.message || "Failed to create client.");
        setCreating(false);
        return;
      }

      setStatus("Client created.");
      setName("");
      setEmail("");
      setPassword("");
      setAddress("");
      setContactNumber("");
      setLogoUrl("");
      await loadClients();
    } catch {
      setStatus("Server error, try again.");
    }

    setCreating(false);
  }

  async function loginAsClient(clientId: string) {
    setActionClientId(clientId);
    setStatus("Opening client session...");

    const res = await fetch("/api/admin/impersonate-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    const data = await res.json().catch(() => ({}));
    const payload = data?.data ?? data;

    if (!res.ok) {
      setStatus(data?.message || "Failed to open client session.");
      setActionClientId("");
      return;
    }

    window.location.href = payload?.redirectTo || "/client-dashboard";
  }

  async function deleteClient(client: ClientRecord) {
    const confirmed = window.confirm(`Delete client "${client.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setActionClientId(client.id);
    setStatus(`Deleting ${client.name}...`);

    const res = await fetch(`/api/admin/clients/${client.id}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data?.message || "Failed to delete client.");
      setActionClientId("");
      return;
    }

    setStatus("Client deleted.");
    setActionClientId("");
    await loadClients();
  }

  return (
    <div className="flex min-h-screen bg-[linear-gradient(180deg,#dfe7f1_0%,#eef3f8_100%)]">
      <Sidebar />

      <main className="flex-1 min-w-0">
        <section className="mx-auto max-w-7xl px-6 py-10">
          <div className="overflow-hidden rounded-[32px] border border-white/60 bg-[radial-gradient(circle_at_top_left,#2747b3_0%,#16307b_35%,#0f1c52_100%)] p-8 text-white shadow-[0_26px_80px_rgba(17,34,84,0.20)]">
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200/90">
                  Admin Control
                </p>
                <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
                  Client Onboarding & Manager
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-slate-200">
                  Create client accounts, review live client records, delete unused accounts,
                  or jump directly into a client session from one control surface.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Total Clients</p>
                  <p className="mt-3 text-4xl font-black">{clients.length}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Manager Actions</p>
                  <p className="mt-3 text-lg font-bold">Delete + Direct Login</p>
                </div>
              </div>
            </div>
          </div>

          {status && (
            <div className="mt-6 rounded-2xl border border-blue-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow">
              {status}
            </div>
          )}

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <form
              onSubmit={handleSubmit}
              className="rounded-[32px] border border-slate-200/70 bg-white p-7 shadow-[0_18px_55px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    New Account
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                    Create Client
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Add a new client with company profile details and login access.
                  </p>
                </div>
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt="Client logo preview"
                    className="h-16 w-16 rounded-2xl border border-slate-200 object-cover"
                  />
                )}
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Client Logo</label>
                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                      }}
                      className="w-full max-w-md rounded-2xl border border-slate-300 bg-white px-4 py-3"
                    />
                    {uploading && (
                      <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-blue-900">
                        Uploading...
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Client Name *</label>
                  <input
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3"
                    placeholder="Client Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Client Email *</label>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3"
                    placeholder="Client Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Password *</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3"
                    placeholder="Set Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Contact Number</label>
                  <input
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3"
                    placeholder="9876543210"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Address</label>
                  <textarea
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3"
                    placeholder="Client Address"
                    rows={4}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={creating || uploading}
                    className="w-full rounded-2xl bg-[#f7c63d] px-6 py-3 font-bold text-slate-950 transition hover:bg-[#ffd457] disabled:opacity-50"
                  >
                    {creating ? "Creating..." : "Create Client"}
                  </button>
                </div>
              </div>
            </form>

            <section className="rounded-[32px] border border-slate-200/70 bg-white p-7 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Client Manager
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                    Manage Registered Clients
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Search current client records and either delete them or open their dashboard directly.
                  </p>
                </div>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search clients..."
                  className="w-full max-w-xs rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
                />
              </div>

              <div className="mt-6 space-y-4">
                {loadingClients ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                    Loading clients...
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                    No clients match the current search.
                  </div>
                ) : (
                  filteredClients.map((client) => {
                    const isBusy = actionClientId === client.id;
                    return (
                      <article
                        key={client.id}
                        className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-sm"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-slate-200 bg-[linear-gradient(135deg,#dbeafe_0%,#f8fafc_100%)] text-lg font-black text-blue-950">
                              {client.logoUrl ? (
                                <img
                                  src={client.logoUrl}
                                  alt={client.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                initials(client.name)
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-xl font-black tracking-tight text-slate-950">
                                  {client.name}
                                </h3>
                                <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-900">
                                  Added {formatDate(client.createdAt)}
                                </span>
                              </div>
                              <p className="mt-2 break-all text-sm font-semibold text-slate-700">
                                {client.email}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {client.contactNumber || "No contact number"}
                              </p>
                              <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                                {client.address || "No address added"}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-3">
                            <button
                              onClick={() => loginAsClient(client.id)}
                              disabled={isBusy}
                              className="rounded-2xl bg-blue-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:opacity-60"
                            >
                              {isBusy ? "Opening..." : "Login to Client"}
                            </button>
                            <button
                              onClick={() => deleteClient(client)}
                              disabled={isBusy}
                              className="rounded-2xl bg-[#ff4343] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#ff5a5a] disabled:opacity-60"
                            >
                              Delete Client
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
