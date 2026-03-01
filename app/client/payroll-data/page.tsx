"use client";

import { useEffect, useState } from "react";
import ClientSidebar from "@/components/ClientSidebar";

type PayrollFile = {
  name: string;
  fileUrl: string;
  updatedAt: string | null;
};

export default function ClientPayrollDataPage() {
  const [files, setFiles] = useState<PayrollFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [moduleEnabled, setModuleEnabled] = useState<boolean | null>(null);

  async function loadFiles() {
    setLoading(true);
    const res = await fetch("/api/client/payroll/records", { cache: "no-store" });
    const data = await res.json();
    const payload = data?.data ?? data;
    setFiles(payload.files || []);
    setLoading(false);
  }

  useEffect(() => {
    async function checkLoginAndLoad() {
      const me = await fetch("/api/client/me");
      const meData = await me.json();
      const loggedIn = meData?.data?.loggedIn ?? meData?.loggedIn ?? false;
      if (!loggedIn) {
        window.location.href = "/signin";
        return;
      }
      const accessRes = await fetch("/api/client/modules?page=payroll_data", { cache: "no-store" });
      const accessData = await accessRes.json().catch(() => ({}));
      if (accessRes.ok && accessData?.data?.enabled === false) {
        setModuleEnabled(false);
        setLoading(false);
        return;
      }
      setModuleEnabled(true);
      await loadFiles();
    }
    checkLoginAndLoad();
  }, []);

  async function exportFile(fileUrl: string, fileName: string) {
    try {
      const res = await fetch(fileUrl);
      if (!res.ok) {
        setStatus("Failed to export payroll file.");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setStatus("Payroll file exported.");
    } catch {
      setStatus("Failed to export payroll file.");
    }
  }

  async function deleteFile(fileName: string) {
    const confirmed = window.confirm(`Delete payroll file "${fileName}"?`);
    if (!confirmed) return;

    const res = await fetch("/api/client/payroll/records", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data?.message || "Failed to delete payroll file.");
      return;
    }

    setStatus("Payroll file deleted.");
    await loadFiles();
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <ClientSidebar />

      <main className="flex-1 p-8">
        {moduleEnabled === false ? (
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-blue-950">Page Disabled</h2>
            <p className="mt-2 text-slate-600">This page is not enabled by consultant.</p>
          </div>
        ) : (
          <>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-950">Payroll Data</h1>
            <p className="mt-1 text-slate-600">
              Generated payroll files are saved here and can be exported.
            </p>
          </div>

          <button
            onClick={loadFiles}
            className="rounded-2xl bg-blue-900 px-5 py-2 font-semibold text-white hover:bg-blue-800"
          >
            Refresh
          </button>
        </div>

        {status && <p className="mt-4 text-sm font-semibold text-slate-700">{status}</p>}

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          {loading ? (
            <p className="text-sm text-slate-600">Loading payroll files...</p>
          ) : files.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                No payroll files found for this client yet.
              </p>
              <a
                href="/client/payroll"
                className="inline-block rounded-xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Go to Payroll
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm text-slate-900">
                <thead className="bg-slate-200 text-left text-slate-700">
                  <tr>
                    <th className="p-3">File Name</th>
                    <th className="p-3">Generated</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.fileUrl} className="border-t">
                      <td className="p-3">{file.name}</td>
                      <td className="p-3">
                        {file.updatedAt
                          ? new Date(file.updatedAt).toLocaleString("en-IN")
                          : "-"}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => exportFile(file.fileUrl, file.name)}
                            className="rounded-xl bg-yellow-500 px-3 py-2 text-xs font-semibold text-blue-950 hover:bg-yellow-400"
                          >
                            Export
                          </button>
                          <button
                            onClick={() => deleteFile(file.name)}
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
          </>
        )}
      </main>
    </div>
  );
}



