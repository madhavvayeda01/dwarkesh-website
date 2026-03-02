"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ClientOption = {
  id: string;
  name: string;
  email: string;
};

type TemplateRow = {
  id: string;
  title: string;
  fileUrl: string;
  createdAt: string;
};

type EventRow = {
  id: string;
  title: string;
  scheduledFor: string;
  scheduledLabel: string;
  generatedFileUrl: string | null;
};

type Props = {
  category: "TRAINING" | "COMMITTEE";
  pageTitle: string;
  helperText: string;
};

const PLACEHOLDERS = [
  ["{{client_name}}", "Client Name"],
  ["{{client_address}}", "Client Address"],
  ["{{client_logo}}", "Client Logo URL"],
  ["{{date}}", "Scheduled Date"],
  ["{{scheduled_date}}", "Scheduled Date Alias"],
  ["{{scheduled_iso}}", "Scheduled Date ISO"],
  ["{{title}}", "Training / Meeting Title"],
  ["{{event_title}}", "Title Alias"],
  ["{{category}}", "Category Label"],
] as const;

export default function ComplianceScheduleAdminPage({ category, pageTitle, helperText }: Props) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState("");
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [countPerTitle, setCountPerTitle] = useState("4");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientId) || null,
    [clients, clientId]
  );

  const loadSchedules = useCallback(async (nextClientId: string) => {
    if (!nextClientId) {
      setTemplates([]);
      setEvents([]);
      return;
    }

    const res = await fetch(
      `/api/admin/compliance/schedules?clientId=${encodeURIComponent(nextClientId)}&category=${category}`,
      { cache: "no-store" }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data?.message || "Failed to load compliance data.");
      return;
    }

    setTemplates(data?.data?.templates || []);
    setEvents(data?.data?.events || []);
  }, [category]);

  useEffect(() => {
    async function init() {
      const meRes = await fetch("/api/admin/me", { cache: "no-store" });
      const meData = await meRes.json().catch(() => ({}));
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
        await loadSchedules(firstClientId);
      }
      setLoading(false);
    }

    void init();
  }, [loadSchedules]);

  async function onClientChange(nextClientId: string) {
    setClientId(nextClientId);
    setStatus("");
    await loadSchedules(nextClientId);
  }

  async function uploadTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) {
      setStatus("Select a client first.");
      return;
    }
    if (!title.trim() || !file) {
      setStatus("Title and DOCX template are required.");
      return;
    }

    setUploading(true);
    setStatus("");

    const formData = new FormData();
    formData.append("clientId", clientId);
    formData.append("category", category);
    formData.append("title", title.trim());
    formData.append("file", file);

    const res = await fetch("/api/admin/compliance/templates", {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus(data?.message || "Failed to upload template.");
      setUploading(false);
      return;
    }

    setTitle("");
    setFile(null);
    setStatus("Template uploaded successfully.");
    await loadSchedules(clientId);
    setUploading(false);
  }

  async function deleteTemplate(id: string) {
    const confirmed = window.confirm("Delete this template?");
    if (!confirmed) return;

    const res = await fetch(`/api/admin/compliance/templates/${id}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data?.message || "Failed to delete template.");
      return;
    }

    setStatus("Template deleted.");
    await loadSchedules(clientId);
  }

  async function generateSchedule() {
    if (!clientId) {
      setStatus("Select a client first.");
      return;
    }

    setGenerating(true);
    setStatus("");

    const res = await fetch("/api/admin/compliance/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        category,
        countPerTitle: Number(countPerTitle) || 4,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data?.message || "Failed to generate schedule.");
      setGenerating(false);
      return;
    }

    setStatus("Schedule generated successfully.");
    await loadSchedules(clientId);
    setGenerating(false);
  }

  return (
    <div className="mx-auto max-w-7xl text-slate-900 dark:text-slate-100">
      <h1 className="text-3xl font-black text-blue-950 dark:text-white md:text-4xl">{pageTitle}</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">{helperText}</p>

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
              Template Setup
            </p>
            <h2 className="mt-2 text-2xl font-black text-blue-950 dark:text-white">
              Upload {category === "TRAINING" ? "Training" : "Committee"} Template
            </h2>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2">
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

              <form onSubmit={uploadTemplate} className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Template Title</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    placeholder={category === "TRAINING" ? "Health & Safety Training" : "POSH Committee Meeting"}
                    required
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">DOCX Template</span>
                  <input
                    type="file"
                    accept=".docx"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    required
                  />
                </label>

                <button
                  type="submit"
                  disabled={uploading}
                  className="rounded-2xl bg-[#f7c63d] px-5 py-3 font-bold text-slate-950 transition hover:bg-[#ffd457] disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload Template"}
                </button>
              </form>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Allowed placeholders</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {PLACEHOLDERS.map(([key, label]) => (
                  <div key={key} className="rounded-xl bg-white p-3 text-sm dark:bg-slate-900">
                    <p className="font-mono font-semibold text-blue-900 dark:text-cyan-300">{key}</p>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-md dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  Schedule Generator
                </p>
                <h2 className="mt-2 text-2xl font-black text-blue-950 dark:text-white">
                  {selectedClient ? `${selectedClient.name}` : "Select Client"}
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Future schedule generation uses a 3-month gap for the same title and avoids holiday clashes.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Instances per title
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={countPerTitle}
                  onChange={(e) => setCountPerTitle(e.target.value)}
                  className="w-24 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <button
                  type="button"
                  onClick={generateSchedule}
                  disabled={generating || !clientId}
                  className="rounded-2xl bg-blue-900 px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {generating ? "Generating..." : "Generate Schedule"}
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <p className="font-bold text-slate-900 dark:text-white">Uploaded Templates</p>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {templates.length === 0 ? (
                  <div className="px-4 py-5 text-sm text-slate-500 dark:text-slate-400">No templates uploaded yet.</div>
                ) : (
                  templates.map((template) => (
                    <div key={template.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{template.title}</p>
                        <a href={template.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-900 hover:underline dark:text-cyan-300">
                          Open template
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => void deleteTemplate(template.id)}
                        className="rounded-2xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Scheduled For</th>
                    <th className="px-4 py-3">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-5 text-slate-500 dark:text-slate-400">
                        No schedules generated yet.
                      </td>
                    </tr>
                  ) : (
                    events.map((event) => (
                      <tr key={event.id}>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{event.title}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{event.scheduledLabel}</td>
                        <td className="px-4 py-3">
                          {event.generatedFileUrl ? (
                            <a
                              href={event.generatedFileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                            >
                              Open PDF
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
