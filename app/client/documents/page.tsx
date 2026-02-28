"use client";

import { useEffect, useState } from "react";
import ClientSidebar from "@/components/ClientSidebar";

type Template = {
  id: string;
  title: string;
};

type GeneratedFile = {
  name: string;
  fileUrl: string;
  updatedAt: string | null;
};

export default function ClientDocumentsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [empCode, setEmpCode] = useState("");
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState("");
  const [moduleEnabled, setModuleEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkLogin() {
      const res = await fetch("/api/client/me");
      const data = await res.json();
      const loggedIn = data?.data?.loggedIn ?? data?.loggedIn ?? false;
      if (!loggedIn) window.location.href = "/signin";
      const accessRes = await fetch("/api/client/modules?page=personal_documents", { cache: "no-store" });
      const accessData = await accessRes.json().catch(() => ({}));
      if (!accessRes.ok || !accessData?.data?.enabled) {
        setModuleEnabled(false);
        setLoadingTemplates(false);
        return false;
      }
      setModuleEnabled(true);
      return true;
    }

    async function loadTemplates() {
      setLoadingTemplates(true);
      try {
        const res = await fetch("/api/client/templates");
        const data = await res.json();
        const payload = data?.data ?? data;
        setTemplates(payload.templates || []);
      } catch {
        setTemplates([]);
      }
      setLoadingTemplates(false);
    }

    async function loadGeneratedFiles() {
      try {
        const res = await fetch("/api/client/generated-files?module=documents");
        const data = await res.json();
        const payload = data?.data ?? data;
        setGeneratedFiles(payload.files || []);
      } catch {
        setGeneratedFiles([]);
      }
    }

    async function init() {
      const canLoad = await checkLogin();
      if (!canLoad) return;
      loadTemplates();
      loadGeneratedFiles();
    }
    init();
  }, []);

  async function handleGenerate() {
    setStatus("");
    if (!templateId) return setStatus("Please select a template.");
    if (!empCode.trim()) return setStatus("Please enter employee code.");

    setGenerating(true);
    setStatus("Generating PDF...");

    try {
      const res = await fetch("/api/client/documents/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, empCode: empCode.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        setStatus(err.message || "Failed to generate PDF.");
        setGenerating(false);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${empCode.trim()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatus("PDF downloaded successfully.");
    } catch {
      setStatus("Server error while generating PDF.");
    }

    setGenerating(false);
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
        <h1 className="text-2xl font-bold text-blue-950">Documents</h1>
        <p className="mt-1 text-slate-600">
          Generate employee PDF documents from admin-approved templates.
        </p>

        <div className="mt-6 max-w-xl rounded-2xl bg-white p-6 shadow">
          <label className="block text-sm font-semibold text-slate-700">
            Select Template
          </label>

          {loadingTemplates ? (
            <p className="mt-2 text-sm text-slate-500">Loading templates...</p>
          ) : templates.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">
              No templates are available for your account. Ask admin to upload templates in
              Document Allotment.
            </p>
          ) : (
            <select
              className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-slate-900"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <option value="">-- Select --</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title}
                </option>
              ))}
            </select>
          )}

          <label className="mt-4 block text-sm font-semibold text-slate-700">
            Employee Code
          </label>
          <input
            className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-slate-900"
            placeholder="Enter employee code (example: EMP001)"
            value={empCode}
            onChange={(e) => setEmpCode(e.target.value)}
          />

          <button
            onClick={handleGenerate}
            disabled={generating || templates.length === 0}
            className="mt-5 w-full rounded-2xl bg-yellow-500 px-6 py-3 font-semibold text-blue-950 hover:bg-yellow-400 disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate PDF"}
          </button>

          {status && (
            <p className="mt-4 text-center text-sm font-semibold text-slate-700">{status}</p>
          )}
        </div>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-bold text-blue-950">Generated Documents</h2>
          {generatedFiles.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              No generated documents available yet.
            </p>
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
                  {generatedFiles.map((file) => (
                    <tr key={file.fileUrl} className="border-t">
                      <td className="p-3">{file.name}</td>
                      <td className="p-3">
                        {file.updatedAt ? new Date(file.updatedAt).toLocaleString("en-IN") : "-"}
                      </td>
                      <td className="p-3">
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl bg-blue-900 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                        >
                          Open
                        </a>
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


