"use client";

import { useEffect, useMemo, useState } from "react";
import ClientSidebar from "@/components/ClientSidebar";
import { CLIENT_PAGE_DEFINITIONS, DEFAULT_PAGE_ACCESS, type ClientPageKey, type PageAccessMap } from "@/lib/module-config";

type Client = {
  id: string;
  name: string;
  email: string;
  logoUrl?: string | null;
  address?: string | null;
  contactNumber?: string | null;
  createdAt: string;
};

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

function initials(name: string | null | undefined) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!words.length) return "CL";
  return words.map((word) => word[0]?.toUpperCase() || "").join("");
}

export default function ClientDashboardPage() {
  const [client, setClient] = useState<Client | null>(null);
  const [pages, setPages] = useState<PageAccessMap>(DEFAULT_PAGE_ACCESS);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({
    name: "",
    address: "",
    contactNumber: "",
    logoUrl: "",
  });

  const enabledPages = useMemo(() => {
    return CLIENT_PAGE_DEFINITIONS.filter((page) => pages[page.key]);
  }, [pages]);

  useEffect(() => {
    async function loadDashboard() {
      const meRes = await fetch("/api/client/me", { cache: "no-store" });
      const meData = await meRes.json().catch(() => ({}));
      const mePayload = meData?.data ?? meData;
      const loggedIn = mePayload?.loggedIn ?? false;

      if (!loggedIn) {
        window.location.href = "/signin";
        return;
      }

      const nextClient = mePayload?.client as Client | null;
      if (nextClient) {
        setClient(nextClient);
        setForm({
          name: nextClient.name || "",
          address: nextClient.address || "",
          contactNumber: nextClient.contactNumber || "",
          logoUrl: nextClient.logoUrl || "",
        });
      }

      const modulesRes = await fetch("/api/client/modules", { cache: "no-store" });
      const modulesData = await modulesRes.json().catch(() => ({}));
      if (modulesRes.ok) {
        setPages({ ...DEFAULT_PAGE_ACCESS, ...(modulesData?.data?.pages || {}) });
      }

      setLoading(false);
    }

    loadDashboard();
  }, []);

  async function logout() {
    await fetch("/api/client/logout", { method: "POST" });
    window.location.href = "/signin";
  }

  async function saveProfile() {
    setSaving(true);
    setStatus("");

    const res = await fetch("/api/client/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    const payload = data?.data ?? data;

    if (!res.ok) {
      setStatus(data?.message || "Failed to update client profile.");
      setSaving(false);
      return;
    }

    const nextClient = payload?.client as Client | undefined;
    if (nextClient) {
      setClient(nextClient);
      setForm({
        name: nextClient.name || "",
        address: nextClient.address || "",
        contactNumber: nextClient.contactNumber || "",
        logoUrl: nextClient.logoUrl || "",
      });
    }

    setEditing(false);
    setSaving(false);
    setStatus("Client profile updated.");
  }

  async function uploadLogo(file: File | null) {
    if (!file) return;

    setUploadingLogo(true);
    setStatus("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/client/logo", {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    const payload = data?.data ?? data;

    if (!res.ok) {
      setStatus(data?.message || "Failed to upload logo.");
      setUploadingLogo(false);
      return;
    }

    const logoUrl = payload?.logoUrl || "";
    setForm((prev) => ({ ...prev, logoUrl }));
    setStatus("Logo uploaded. Save profile to apply it.");
    setUploadingLogo(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[linear-gradient(180deg,#dfe7f1_0%,#eef3f8_100%)]">
        <ClientSidebar />
        <main className="flex-1 p-8">
          <div className="mx-auto max-w-7xl animate-pulse space-y-6">
            <div className="h-52 rounded-[32px] bg-white/70 shadow" />
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="h-72 rounded-[32px] bg-white/70 shadow" />
              <div className="h-72 rounded-[32px] bg-white/70 shadow" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[linear-gradient(180deg,#dfe7f1_0%,#eef3f8_100%)]">
      <ClientSidebar />

      <main className="flex-1 min-w-0 p-6 md:p-8">
        <section className="mx-auto max-w-7xl space-y-6">
          <div className="overflow-hidden rounded-[32px] border border-white/60 bg-[radial-gradient(circle_at_top_left,#2448b5_0%,#16307d_35%,#0f1d53_100%)] text-white shadow-[0_28px_80px_rgba(17,34,84,0.22)]">
            <div className="grid gap-8 p-6 md:p-8 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="space-y-6">
                <div className="flex flex-wrap items-start gap-5">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[28px] border border-white/20 bg-white/10 text-3xl font-black tracking-tight text-white shadow-inner">
                    {client?.logoUrl ? (
                      <img
                        src={client.logoUrl}
                        alt={client?.name || "Client logo"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials(client?.name)
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200/90">
                      Client Profile
                    </p>
                    <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                      {client?.name || "Client Dashboard"}
                    </h1>
                    <p className="max-w-2xl text-sm text-slate-200 md:text-base">
                      Central view for company details, active modules, and profile updates.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Email</p>
                    <p className="mt-2 break-all text-sm font-semibold text-white">
                      {client?.email || "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Contact</p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {client?.contactNumber || "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Joined</p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {formatDate(client?.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-4 rounded-[28px] border border-white/12 bg-white/10 p-5 backdrop-blur">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                    Quick Actions
                  </p>
                  <div className="mt-4 space-y-3">
                    <button
                      onClick={() => setEditing((prev) => !prev)}
                      className="w-full rounded-2xl bg-[#f7c63d] px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-[#ffd457]"
                    >
                      {editing ? "Close Edit Panel" : "Edit Client Info"}
                    </button>
                    <a
                      href={enabledPages[0]?.href || "/client/employees"}
                      className="block w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-white/15"
                    >
                      {enabledPages[0] ? `Open ${enabledPages[0].label}` : "Open Client Pages"}
                    </a>
                    <button
                      onClick={logout}
                      className="w-full rounded-2xl bg-[#ff4343] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#ff5a5a]"
                    >
                      Logout
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-cyan-200/15 bg-slate-950/20 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">
                    Address
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-100">
                    {client?.address || "No address added yet."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {status && (
            <div className="rounded-2xl border border-blue-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow">
              {status}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[32px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Company Details
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                    Client Information
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600">
                    Use this section to keep your company profile current for payroll,
                    documents, and other client-facing records.
                  </p>
                </div>
                <button
                  onClick={() => setEditing((prev) => !prev)}
                  className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
                >
                  {editing ? "Hide Editor" : "Edit Info"}
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Company Name
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-900">{client?.name || "-"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Contact Number
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {client?.contactNumber || "-"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Email Address
                  </p>
                  <p className="mt-2 break-all text-lg font-bold text-slate-900">
                    {client?.email || "-"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Address
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-base font-semibold text-slate-900">
                    {client?.address || "-"}
                  </p>
                </div>
              </div>

              {editing && (
                <div className="mt-6 rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#faf7f0_0%,#f4f7fb_100%)] p-5">
                  <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-4">
                      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                        <div className="flex h-52 items-center justify-center bg-[linear-gradient(135deg,#dbeafe_0%,#f8fafc_100%)]">
                          {form.logoUrl ? (
                            <img
                              src={form.logoUrl}
                              alt="Client logo preview"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-24 w-24 items-center justify-center rounded-[24px] bg-blue-950 text-3xl font-black text-white">
                              {initials(form.name)}
                            </div>
                          )}
                        </div>
                        <div className="space-y-3 p-4">
                          <label className="block text-sm font-semibold text-slate-700">
                            Upload Logo
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => uploadLogo(e.target.files?.[0] || null)}
                            className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                          />
                          <p className="text-xs text-slate-500">
                            PNG, JPG, WEBP up to 5 MB.
                          </p>
                          {uploadingLogo && (
                            <p className="text-xs font-semibold text-blue-900">Uploading logo...</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold text-slate-700">Company Name</span>
                        <input
                          value={form.name}
                          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className="text-sm font-semibold text-slate-700">Contact Number</span>
                        <input
                          value={form.contactNumber}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, contactNumber: e.target.value }))
                          }
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className="text-sm font-semibold text-slate-700">Logo URL</span>
                        <input
                          value={form.logoUrl}
                          onChange={(e) => setForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className="text-sm font-semibold text-slate-700">Address</span>
                        <textarea
                          rows={5}
                          value={form.address}
                          onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
                        />
                      </label>

                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={saveProfile}
                          disabled={saving}
                          className="rounded-2xl bg-blue-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {saving ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          onClick={() => {
                            setEditing(false);
                            setForm({
                              name: client?.name || "",
                              address: client?.address || "",
                              contactNumber: client?.contactNumber || "",
                              logoUrl: client?.logoUrl || "",
                            });
                            setStatus("");
                          }}
                          className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-800 transition hover:bg-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[32px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Access Snapshot
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                Active Pages
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Quick shortcuts to the client pages currently enabled for this account.
              </p>

              <div className="mt-5 grid gap-3">
                {enabledPages.map((page) => (
                  <a
                    key={page.key}
                    href={page.href}
                    className="group rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-bold text-slate-900">{page.label}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Enabled
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-950 px-3 py-1 text-xs font-bold text-white transition group-hover:bg-blue-800">
                        Open
                      </span>
                    </div>
                  </a>
                ))}

                {enabledPages.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                    No feature pages are enabled for this client account yet.
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
