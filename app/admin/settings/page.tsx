"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  ADMIN_PAGE_DEFINITIONS,
  DEFAULT_ADMIN_PAGE_ACCESS,
  type AdminPageAccessMap,
} from "@/lib/admin-config";

type Consultant = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  pageAccess: AdminPageAccessMap;
  createdAt: string;
  updatedAt: string;
};

type Summary = {
  admin: {
    id: string;
    type: "env_admin" | "consultant";
    name: string;
    email: string;
  };
  consultantCount: number;
  security: {
    jwtConfigured: boolean;
    envAdminConfigured: boolean;
    enquiryEmailConfigured: boolean;
    sessionDurationDays: number;
  };
};

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminSettingsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [accessConsultantId, setAccessConsultantId] = useState<string | null>(null);
  const [accessDraft, setAccessDraft] = useState<AdminPageAccessMap | null>(null);

  const activeConsultants = useMemo(
    () => consultants.filter((consultant) => consultant.active).length,
    [consultants]
  );

  const loadData = useCallback(async () => {
    const [summaryRes, consultantsRes] = await Promise.all([
      fetch("/api/admin/settings", { cache: "no-store" }),
      fetch("/api/admin/consultants", { cache: "no-store" }),
    ]);

    const summaryData = await summaryRes.json().catch(() => ({}));
    const consultantsData = await consultantsRes.json().catch(() => ({}));

    if (summaryRes.ok) {
      setSummary(summaryData?.data ?? null);
    }

    if (consultantsRes.ok) {
      setConsultants(consultantsData?.data?.consultants || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      const me = await fetch("/api/admin/me", { cache: "no-store" });
      const meData = await me.json().catch(() => ({}));
      const loggedIn = meData?.data?.loggedIn ?? meData?.loggedIn ?? false;
      if (!loggedIn) {
        window.location.assign("/signin");
        return;
      }

      await loadData();
    }

    void init();
  }, [loadData]);

  async function createConsultant(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus("");

    const res = await fetch("/api/admin/consultants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus(data?.message || "Failed to create consultant.");
      setSaving(false);
      return;
    }

    setForm({ name: "", email: "", password: "" });
    setStatus("Consultant created.");
    await loadData();
    setSaving(false);
  }

  async function toggleConsultant(id: string, active: boolean) {
    setStatus("");
    const res = await fetch(`/api/admin/consultants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus(data?.message || "Failed to update consultant.");
      return;
    }

    setStatus(active ? "Consultant activated." : "Consultant deactivated.");
    await loadData();
  }

  async function deleteConsultant(id: string) {
    const confirmed = window.confirm("Delete this consultant account?");
    if (!confirmed) return;

    setStatus("");
    const res = await fetch(`/api/admin/consultants/${id}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus(data?.message || "Failed to delete consultant.");
      return;
    }

    setStatus("Consultant deleted.");
    await loadData();
  }

  async function saveConsultantAccess() {
    if (!accessConsultantId || !accessDraft) return;

    setSavingAccess(true);
    setStatus("");
    const res = await fetch(`/api/admin/consultants/${accessConsultantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageAccess: accessDraft }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus(data?.message || "Failed to update consultant access.");
      setSavingAccess(false);
      return;
    }

    setStatus("Consultant access updated.");
    setAccessConsultantId(null);
    setAccessDraft(null);
    await loadData();
    setSavingAccess(false);
  }

  const accessConsultant = useMemo(
    () => consultants.find((consultant) => consultant.id === accessConsultantId) || null,
    [consultants, accessConsultantId]
  );

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <main className="flex-1 p-8 text-slate-900">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-extrabold text-blue-950 md:text-4xl">Admin Settings</h1>
          <p className="mt-2 text-slate-600">
            Manage consultant accounts and review core platform settings.
          </p>

          {status && (
            <div className="mt-6 rounded-2xl border border-blue-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow">
              {status}
            </div>
          )}

          {loading ? (
            <p className="mt-8 text-slate-600">Loading settings...</p>
          ) : (
            <>
              <section className="mt-8 grid gap-6 lg:grid-cols-4">
                <div className="rounded-3xl bg-white p-6 shadow-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Current Admin
                  </p>
                  <p className="mt-3 text-xl font-black text-slate-900">
                    {summary?.admin.name || "Primary Admin"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{summary?.admin.email || "-"}</p>
                </div>

                <div className="rounded-3xl bg-white p-6 shadow-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Consultants
                  </p>
                  <p className="mt-3 text-xl font-black text-slate-900">{consultants.length}</p>
                  <p className="mt-1 text-sm text-slate-600">{activeConsultants} active accounts</p>
                </div>

                <div className="rounded-3xl bg-white p-6 shadow-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Security
                  </p>
                  <p className="mt-3 text-xl font-black text-slate-900">
                    {summary?.security.jwtConfigured ? "JWT Ready" : "JWT Missing"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {summary?.security.sessionDurationDays || 7}-day admin session
                  </p>
                </div>

                <div className="rounded-3xl bg-white p-6 shadow-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Enquiry Mail
                  </p>
                  <p className="mt-3 text-xl font-black text-slate-900">
                    {summary?.security.enquiryEmailConfigured ? "Configured" : "Not Configured"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Lead notifications status only. No secrets shown.
                  </p>
                </div>
              </section>

              <section className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-3xl bg-white p-6 shadow-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Add Consultant
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-blue-950">
                    Create Admin-Level Consultant
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Consultants created here can sign in from the normal sign-in page. All admin
                    pages are allowed by default and can then be limited with Manage Access.
                  </p>

                  <form onSubmit={createConsultant} className="mt-6 grid gap-4">
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700">Consultant Name</span>
                      <input
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
                        required
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700">Consultant Email</span>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
                        required
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700">Temporary Password</span>
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
                        minLength={8}
                        required
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-2xl bg-[#f7c63d] px-6 py-3 font-bold text-slate-950 transition hover:bg-[#ffd457] disabled:opacity-50"
                    >
                      {saving ? "Creating..." : "Add Consultant"}
                    </button>
                  </form>
                </div>

                <div className="rounded-3xl bg-white p-6 shadow-md">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Consultant Manager
                      </p>
                      <h2 className="mt-2 text-2xl font-black text-blue-950">Consultant Access</h2>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-900">
                      Configurable
                    </span>
                  </div>

                  <div className="mt-5 space-y-4">
                    {consultants.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                        No consultant accounts created yet.
                      </div>
                    ) : (
                      consultants.map((consultant) => (
                        <div
                          key={consultant.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-black text-slate-900">
                                {consultant.name}
                              </h3>
                              <p className="mt-1 text-sm text-slate-600">{consultant.email}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                Created {formatDate(consultant.createdAt)}
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                consultant.active
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {consultant.active ? "Active" : "Inactive"}
                            </span>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              onClick={() => {
                                setAccessConsultantId(consultant.id);
                                setAccessDraft({ ...consultant.pageAccess });
                                setStatus("");
                              }}
                              className="rounded-2xl bg-blue-900 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                            >
                              Manage Access
                            </button>
                            <button
                              onClick={() => toggleConsultant(consultant.id, !consultant.active)}
                              className={`rounded-2xl px-4 py-2 text-sm font-bold ${
                                consultant.active
                                  ? "bg-slate-700 text-white hover:bg-slate-600"
                                  : "bg-emerald-600 text-white hover:bg-emerald-500"
                              }`}
                            >
                              {consultant.active ? "Deactivate" : "Activate"}
                            </button>

                            <button
                              onClick={() => deleteConsultant(consultant.id)}
                              className="rounded-2xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-400"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              {accessConsultant && accessDraft && (
                <section className="mt-8 rounded-3xl bg-white p-6 shadow-md">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Manage Access
                      </p>
                      <h2 className="mt-2 text-2xl font-black text-blue-950">
                        {accessConsultant.name}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">{accessConsultant.email}</p>
                      <p className="mt-2 text-sm text-slate-600">
                        Hidden pages disappear from the sidebar and direct URL access is blocked.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAccessConsultantId(null);
                        setAccessDraft(null);
                      }}
                      className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {ADMIN_PAGE_DEFINITIONS.map((page) => (
                      <label
                        key={page.key}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-900">{page.label}</p>
                            <p className="mt-1 text-xs text-slate-500">{page.href}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={accessDraft[page.key]}
                            onChange={(e) =>
                              setAccessDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      [page.key]: e.target.checked,
                                    }
                                  : prev
                              )
                            }
                          />
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={saveConsultantAccess}
                      disabled={savingAccess}
                      className="rounded-2xl bg-[#f7c63d] px-5 py-3 font-bold text-slate-950 hover:bg-[#ffd457] disabled:opacity-50"
                    >
                      {savingAccess ? "Saving..." : "Save Access"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccessDraft({ ...DEFAULT_ADMIN_PAGE_ACCESS })}
                      className="rounded-2xl border border-slate-300 px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Allow All
                    </button>
                  </div>
                </section>
              )}

              <section className="mt-8 rounded-3xl bg-white p-6 shadow-md">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Important Notes
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-bold text-slate-900">Admin Access Scope</p>
                    <p className="mt-2 text-sm text-slate-600">
                      Consultants start with full admin page access, but each page can be turned on
                      or off individually.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-bold text-slate-900">Primary Admin</p>
                    <p className="mt-2 text-sm text-slate-600">
                      The environment admin login still remains active as the fallback root account.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-bold text-slate-900">Operational Checks</p>
                    <p className="mt-2 text-sm text-slate-600">
                      JWT and enquiry email status are shown here so failures are visible without
                      exposing secret values.
                    </p>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
