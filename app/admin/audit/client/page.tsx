"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Client = {
  id: string;
  name: string;
  email: string;
};

type AuditFile = {
  name: string;
  fileUrl: string;
  updatedAt: string | null;
};

export default function AdminAuditPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<AuditFile[]>([]);
  const [status, setStatus] = useState("");
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function init() {
      const me = await fetch("/api/admin/me");
      const meData = await me.json();
      const loggedIn = meData?.data?.loggedIn ?? meData?.loggedIn ?? false;
      if (!loggedIn) {
        window.location.href = "/signin";
        return;
      }

      const res = await fetch("/api/admin/clients-list");
      const data = await res.json();
      const payload = data?.data ?? data;
      const nextClients = payload.clients || [];
      setClients(nextClients);
      if (nextClients.length > 0) {
        setClientId(nextClients[0].id);
      }
    }

    init();
  }, []);

  async function loadFiles(selectedClientId = clientId) {
    if (!selectedClientId) return;
    setLoadingFiles(true);
    const res = await fetch(`/api/admin/audit-files?clientId=${selectedClientId}`, {
      cache: "no-store",
    });
    const data = await res.json();
    const payload = data?.data ?? data;
    setFiles(payload.files || []);
    setLoadingFiles(false);
  }

  useEffect(() => {
    if (!clientId) {
      setFiles([]);
      return;
    }
    loadFiles(clientId);
  }, [clientId]);

  async function handleUpload() {
    if (!clientId) {
      setStatus("Please select client.");
      return;
    }
    if (!file) {
      setStatus("Please select file.");
      return;
    }

    setUploading(true);
    setStatus("Uploading audit file...");
    const formData = new FormData();
    formData.append("clientId", clientId);
    formData.append("file", file);

    const res = await fetch("/api/admin/audit-files", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data?.message || "Upload failed.");
      setUploading(false);
      return;
    }

    setStatus("Audit file uploaded.");
    setFile(null);
    await loadFiles(clientId);
    setUploading(false);
  }

  async function handleDelete(fileName: string) {
    if (!clientId) return;
    const confirmed = window.confirm(`Delete file "${fileName}"?`);
    if (!confirmed) return;

    const res = await fetch("/api/admin/audit-files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, fileName }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data?.message || "Delete failed.");
      return;
    }

    setStatus("Audit file deleted.");
    await loadFiles(clientId);
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 p-8">
        <h1 className="text-3xl font-extrabold text-blue-950">Audit Module</h1>
        <p className="mt-2 text-slate-600">
          Client Audit: upload and manage audit files for each client.
        </p>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-semibold text-slate-700">Client</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="mt-1 w-full rounded-xl border bg-white px-4 py-3 text-slate-900"
              >
                <option value="">-- Select Client --</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">File</label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="mt-1 w-full rounded-xl border bg-white px-4 py-3 text-slate-900"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="rounded-2xl bg-yellow-500 px-6 py-3 font-semibold text-blue-950 hover:bg-yellow-400 disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload Audit File"}
              </button>
              <button
                onClick={() => loadFiles(clientId)}
                className="rounded-2xl bg-blue-900 px-6 py-3 font-semibold text-white hover:bg-blue-800"
              >
                Refresh
              </button>
            </div>
          </div>

          {status && <p className="mt-4 text-sm font-semibold text-slate-700">{status}</p>}
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-bold text-blue-950">Audit Files</h2>
          {loadingFiles ? (
            <p className="mt-3 text-sm text-slate-600">Loading files...</p>
          ) : files.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No audit files uploaded.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border">
              <table className="w-full text-sm text-slate-900">
                <thead className="bg-slate-200 text-left text-slate-700">
                  <tr>
                    <th className="p-3">File Name</th>
                    <th className="p-3">Updated</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((item) => (
                    <tr key={item.fileUrl} className="border-t">
                      <td className="p-3">{item.name}</td>
                      <td className="p-3">
                        {item.updatedAt
                          ? new Date(item.updatedAt).toLocaleString("en-IN")
                          : "-"}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <a
                            href={item.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl bg-blue-900 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                          >
                            Open
                          </a>
                          <button
                            onClick={() => handleDelete(item.name)}
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
      </main>
    </div>
  );
}
