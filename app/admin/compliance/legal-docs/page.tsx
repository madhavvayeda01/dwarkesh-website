"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";

type ClientOption = {
  id: string;
  name: string;
  email: string;
};

type LegalDoc = {
  id: string;
  name: string;
  issueDate: string | null;
  expiryDate: string;
  remarks: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatus(expiryDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(expiryDate);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: "Expired", tone: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200" };
  if (diff <= 7) return { label: `Expiring in ${diff}d`, tone: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200" };
  if (diff <= 30) return { label: `Due in ${diff}d`, tone: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-100" };
  return { label: "Active", tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200" };
}

export default function AdminComplianceLegalDocsPage() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState("");
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: "",
    issueDate: "",
    expiryDate: "",
    remarks: "",
  });

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientId) || null,
    [clients, clientId]
  );

  async function loadDocs(nextClientId: string) {
    if (!nextClientId) {
      setDocs([]);
      return;
    }

    const res = await fetch(`/api/admin/compliance/legal-docs?clientId=${encodeURIComponent(nextClientId)}`, {
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data?.message || "Failed to load documents.");
      return;
    }

    setDocs(data?.data?.documents || []);
  }

  useEffect(() => {
    async function init() {
      const me = await fetch("/api/admin/me", { cache: "no-store" });
      const meData = await me.json().catch(() => ({}));
      const loggedIn = meData?.data?.loggedIn ?? meData?.loggedIn ?? false;
      if (!loggedIn) {
        window.location.assign("/signin");
        return;
      }

      const clientsRes = await fetch("/api/admin/clients-list", { cache: "no-store" });
      const clientsData = await clientsRes.json().catch(() => ({}));
      if (!clientsRes.ok) {
        setStatus(clientsData?.message || "Failed to load clients.");
        setLoading(false);
        return;
      }

      const nextClients = clientsData?.data?.clients || [];
      setClients(nextClients);
      const firstClientId = nextClients[0]?.id || "";
      setClientId(firstClientId);
      if (firstClientId) {
        await loadDocs(firstClientId);
      }
      setLoading(false);
    }

    void init();
  }, []);

  async function onClientChange(nextClientId: string) {
    setClientId(nextClientId);
    setEditingId(null);
    setForm({ name: "", issueDate: "", expiryDate: "", remarks: "" });
    setStatus("");
    await loadDocs(nextClientId);
  }

  async function saveDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) {
      setStatus("Select a client first.");
      return;
    }

    setSaving(true);
    setStatus("");

    const payload = {
      clientId,
      name: form.name.trim(),
      issueDate: form.issueDate || null,
      expiryDate: form.expiryDate,
      remarks: form.remarks.trim() || null,
    };

    const res = await fetch(
      editingId ? `/api/admin/compliance/legal-docs/${editingId}` : "/api/admin/compliance/legal-docs",
      {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data?.message || "Failed to save document.");
      setSaving(false);
      return;
    }

    setForm({ name: "", issueDate: "", expiryDate: "", remarks: "" });
    setEditingId(null);
    setStatus(editingId ? "Document updated." : "Document added.");
    await loadDocs(clientId);
    setSaving(false);
  }

  async function removeDoc(id: string) {
    const confirmed = window.confirm("Delete this document record?");
    if (!confirmed) return;

    const res = await fetch(`/api/admin/compliance/legal-docs/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data?.message || "Failed to delete document.");
      return;
    }

    setStatus("Document deleted.");
    await loadDocs(clientId);
  }

  async function importDocs(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !importFile) {
      setStatus("Select a client and choose an Excel file.");
      return;
    }

    setImporting(true);
    setStatus("");
    const formData = new FormData();
    formData.append("clientId", clientId);
    formData.append("file", importFile);

    const res = await fetch("/api/admin/compliance/legal-docs/import", {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data?.message || "Import failed.");
      setImporting(false);
      return;
    }

    setImportFile(null);
    setStatus(`Imported ${data?.data?.count || 0} records.`);
    await loadDocs(clientId);
    setImporting(false);
  }

  function startEdit(doc: LegalDoc) {
    setEditingId(doc.id);
    setForm({
      name: doc.name,
      issueDate: doc.issueDate ? new Date(doc.issueDate).toISOString().slice(0, 10) : "",
      expiryDate: new Date(doc.expiryDate).toISOString().slice(0, 10),
      remarks: doc.remarks || "",
    });
    setStatus("");
  }

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
      <Sidebar />
      <main className="flex-1 p-8 text-slate-900 dark:text-slate-100">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-black text-blue-950 dark:text-white md:text-4xl">Compliance Legal Doc</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Track expiry-based compliance documents, bulk import them via Excel, and export the current register anytime.
          </p>

          {status && (
            <div className="mt-6 rounded-2xl border border-blue-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {status}
            </div>
          )}

          {loading ? (
            <p className="mt-8 text-slate-600 dark:text-slate-300">Loading...</p>
          ) : (
            <div className="mt-8 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <section className="rounded-3xl bg-white p-6 shadow-md dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  Document Register
                </p>
                <h2 className="mt-2 text-2xl font-black text-blue-950 dark:text-white">
                  {editingId ? "Edit Document" : "Add Required Document"}
                </h2>

                <label className="mt-5 grid gap-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Client</span>
                  <select
                    value={clientId}
                    onChange={(e) => void onClientChange(e.target.value)}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="">Select Client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} ({client.email})
                      </option>
                    ))}
                  </select>
                </label>

                <form onSubmit={saveDoc} className="mt-5 grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Document Name</span>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      placeholder="Factory License"
                      required
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Issue Date</span>
                      <input
                        type="date"
                        value={form.issueDate}
                        onChange={(e) => setForm((prev) => ({ ...prev, issueDate: e.target.value }))}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Expiry Date</span>
                      <input
                        type="date"
                        value={form.expiryDate}
                        onChange={(e) => setForm((prev) => ({ ...prev, expiryDate: e.target.value }))}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        required
                      />
                    </label>
                  </div>

                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Remarks</span>
                    <textarea
                      value={form.remarks}
                      onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
                      rows={4}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      placeholder="Optional notes"
                    />
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-2xl bg-[#f7c63d] px-5 py-3 font-bold text-slate-950 hover:bg-[#ffd457] disabled:opacity-50"
                    >
                      {saving ? "Saving..." : editingId ? "Update Document" : "Add Document"}
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setForm({ name: "", issueDate: "", expiryDate: "", remarks: "" });
                        }}
                        className="rounded-2xl border border-slate-300 px-5 py-3 font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>

                <form onSubmit={importDocs} className="mt-6 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                  <p className="font-bold text-slate-900 dark:text-white">Bulk import / export</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Excel columns: Document Name, Issue Date, Expiry Date, Remarks.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={importing}
                      className="rounded-2xl bg-blue-900 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                    >
                      {importing ? "Importing..." : "Import Excel"}
                    </button>
                    <a
                      href={clientId ? `/api/admin/compliance/legal-docs/export?clientId=${encodeURIComponent(clientId)}` : "#"}
                      className={`rounded-2xl px-5 py-3 font-bold ${clientId ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900" : "pointer-events-none bg-slate-300 text-slate-500"}`}
                    >
                      Export Excel
                    </a>
                  </div>
                </form>
              </section>

              <section className="rounded-3xl bg-white p-6 shadow-md dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  Current Register
                </p>
                <h2 className="mt-2 text-2xl font-black text-blue-950 dark:text-white">
                  {selectedClient ? selectedClient.name : "Select Client"}
                </h2>

                <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <tr>
                        <th className="px-4 py-3">Document</th>
                        <th className="px-4 py-3">Issue</th>
                        <th className="px-4 py-3">Expiry</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
                      {docs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-5 text-slate-500 dark:text-slate-400">
                            No compliance documents added yet.
                          </td>
                        </tr>
                      ) : (
                        docs.map((doc) => {
                          const statusInfo = getStatus(doc.expiryDate);
                          return (
                            <tr key={doc.id}>
                              <td className="px-4 py-3">
                                <p className="font-semibold text-slate-900 dark:text-white">{doc.name}</p>
                                {doc.remarks ? (
                                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{doc.remarks}</p>
                                ) : null}
                              </td>
                              <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatDate(doc.issueDate)}</td>
                              <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatDate(doc.expiryDate)}</td>
                              <td className="px-4 py-3">
                                <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusInfo.tone}`}>
                                  {statusInfo.label}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => startEdit(doc)}
                                    className="rounded-xl bg-blue-900 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => void removeDoc(doc.id)}
                                    className="rounded-xl bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-400"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
