"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Client = {
  id: string;
  name: string;
  email: string;
};

type Template = {
  id: string;
  title: string;
  fileUrl: string;
  createdAt: string;
  client: Client;
  group: { name: string };
};

const PERSONAL_FILE_DOCS = [
  "Appointment Letter",
  "Confirmation Letter",
  "PF Form 2",
  "Form F",
  "GN",
  "PF 11-p1",
  "Joining Letter",
  "ORI",
  "RESIGN",
  "F&F",
];

export default function AdminDocumentAllotmentPage() {
  // Admin login check
  useEffect(() => {
    async function checkLogin() {
      const res = await fetch("/api/admin/me");
      const data = await res.json();
      const loggedIn = data?.data?.loggedIn ?? data?.loggedIn ?? false;
      if (!loggedIn) window.location.href = "/signin";
    }
    checkLogin();
  }, []);

  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState(PERSONAL_FILE_DOCS[0]);
  const [file, setFile] = useState<File | null>(null);

  const [status, setStatus] = useState("");

  async function fetchClients() {
    const res = await fetch("/api/admin/clients-list");
    const data = await res.json();
    const payload = data?.data ?? data;
    setClients(payload.clients || []);
  }

  async function fetchTemplates() {
    setLoading(true);
    const res = await fetch("/api/admin/document-templates");
    const data = await res.json();
    const payload = data?.data ?? data;
    setTemplates(payload.templates || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchClients();
    fetchTemplates();
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();

    if (!clientId) return setStatus("Please select client");
    if (!title) return setStatus("Please select document title");
    if (!file) return setStatus("Please select a DOCX file");

    setStatus("Uploading template...");

    const formData = new FormData();
    formData.append("clientId", clientId);
    formData.append("groupName", "Personal File");
    formData.append("title", title);
    formData.append("file", file);

    const res = await fetch("/api/admin/document-templates", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(`${data.message || "Upload failed"}`);
      return;
    }

    setStatus("Template uploaded successfully!");
    setFile(null);
    fetchTemplates();
  }

  async function handleDeleteTemplate(id: string) {
    const confirmed = confirm("Delete this template?");
    if (!confirmed) return;

    const res = await fetch(`/api/admin/document-templates/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();

    if (!res.ok) {
      setStatus(`${data.message || "Failed to delete template"}`);
      return;
    }

    setStatus("Template deleted successfully!");
    fetchTemplates();
  }

  async function handleEditTemplateTitle(id: string, currentTitle: string) {
    const nextTitle = prompt("Enter new template title:", currentTitle)?.trim();
    if (!nextTitle || nextTitle === currentTitle) return;

    const res = await fetch(`/api/admin/document-templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: nextTitle }),
    });
    const data = await res.json();

    if (!res.ok) {
      setStatus(`${data.message || "Failed to update template"}`);
      return;
    }

    setStatus("Template title updated successfully!");
    fetchTemplates();
  }

  const personalFileTemplates = templates.filter(
    (t) => t.group?.name === "Personal File"
  );

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-blue-950 md:text-4xl">
                Document Allotment
              </h1>
              <p className="mt-2 text-slate-600">
                Upload DOCX templates under <b>Personal File</b> group.
              </p>
            </div>

            <button
              onClick={fetchTemplates}
              className="rounded-2xl bg-blue-900 px-5 py-2 font-semibold text-white hover:bg-blue-800"
            >
              Refresh
            </button>
          </div>

          {/* Upload */}
          <form
            onSubmit={handleUpload}
            className="mt-8 rounded-3xl bg-white p-8 shadow-md"
          >
            <h2 className="text-xl font-bold text-blue-950">
              Upload Personal File Template
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Select Client *
                </label>
                <select
                  className="mt-1 w-full rounded-xl border px-4 py-3"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  required
                >
                  <option value="">-- Select Client --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Document Title *
                </label>
                <select
                  className="mt-1 w-full rounded-xl border px-4 py-3"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                >
                  {PERSONAL_FILE_DOCS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Upload DOCX *
                </label>
                <input
                  type="file"
                  accept=".docx"
                  className="mt-1 w-full rounded-xl border px-4 py-3"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-6 w-full rounded-2xl bg-yellow-500 px-6 py-3 font-semibold text-blue-950 hover:bg-yellow-400"
            >
              Upload Template
            </button>

            {status && (
              <p className="mt-3 text-sm font-semibold text-slate-700">
                {status}
              </p>
            )}

            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
  <p className="font-bold text-blue-950">Allowed placeholders:</p>

  <ul className="mt-2 list-disc pl-5">
    <li>{"{{client_name}}"}</li>
    <li>{"{{employee_full_name}}"}</li>
    <li>{"{{employee_emp_no}}"}</li>
    <li>{"{{employee_designation}}"}</li>
    <li>{"{{employee_department}}"}</li>
  </ul>

  <p className="mt-2 text-xs text-slate-500">
    (We will add all 51 employee fields in next step)
  </p>
</div>

          </form>

          {/* List */}
          <div className="mt-10 rounded-3xl bg-white p-6 shadow-md">
            <h2 className="text-xl font-bold text-blue-950">
              Uploaded Templates (Personal File)
            </h2>

            {loading ? (
              <p className="mt-6 text-slate-600">Loading templates...</p>
            ) : personalFileTemplates.length === 0 ? (
              <p className="mt-6 text-slate-600">No templates uploaded yet.</p>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-200 text-left text-slate-700">
                      <th className="p-3">Client</th>
                      <th className="p-3">Title</th>
                      <th className="p-3">File</th>
                      <th className="p-3">Uploaded</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personalFileTemplates.map((t) => (
                      <tr key={t.id} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-semibold text-blue-950">
                          {t.client?.name}
                        </td>
                        <td className="p-3 text-slate-700">{t.title}</td>
                        <td className="p-3">
                          <a
                            href={t.fileUrl}
                            target="_blank"
                            className="rounded-xl bg-blue-900 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                          >
                            View DOCX
                          </a>
                        </td>
                        <td className="p-3 text-slate-600">
                          {new Date(t.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() =>
                                handleEditTemplateTitle(t.id, t.title)
                              }
                              className="rounded-xl bg-yellow-500 px-3 py-2 text-xs font-semibold text-blue-950 hover:bg-yellow-400"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(t.id)}
                              className="rounded-xl bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-400"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}


