"use client";

import { useEffect, useState } from "react";
import ClientSidebar from "@/components/ClientSidebar";

type Template = {
  id: string;
  title: string;
};

export default function ClientDocumentsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [empCode, setEmpCode] = useState("");

  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    async function checkLogin() {
      const res = await fetch("/api/client/me");
      const data = await res.json();
      if (!data.loggedIn) window.location.href = "/signin";
    }

    async function loadTemplates() {
      setLoadingTemplates(true);
      try {
        const res = await fetch("/api/client/templates");
        const data = await res.json();
        setTemplates(data.templates || []);
      } catch {
        setTemplates([]);
      }
      setLoadingTemplates(false);
    }

    checkLogin();
    loadTemplates();
  }, []);

  async function handleGenerate() {
    setStatus("");
    if (!templateId) return setStatus("❌ Please select a template");
    if (!empCode) return setStatus("❌ Please enter Employee Code");

    setGenerating(true);
    setStatus("Generating PDF...");

    try {
      const res = await fetch("/api/client/documents/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, empCode }),
      });

      if (!res.ok) {
        const err = await res.json();
        setStatus(`❌ ${err.message || "Failed to generate PDF"}`);
        setGenerating(false);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${empCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);

      setStatus("✅ PDF downloaded successfully");
    } catch {
      setStatus("❌ Server error while generating PDF");
    }

    setGenerating(false);
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <ClientSidebar />

      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-blue-950">Documents</h1>
        <p className="mt-1 text-slate-600">
          Generate PDF documents using templates provided by Admin.
        </p>

        <div className="mt-6 max-w-xl rounded-2xl bg-white p-6 shadow">
          <label className="block text-sm font-semibold text-slate-700">
            Select Template
          </label>

          {loadingTemplates ? (
            <p className="mt-2 text-sm text-slate-500">Loading templates...</p>
          ) : (
            <select
              className="mt-2 w-full rounded-xl border px-4 py-3 text-slate-900"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <option value="">-- Select --</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}

          <label className="mt-4 block text-sm font-semibold text-slate-700">
            Employee Code
          </label>
          <input
            className="mt-2 w-full rounded-xl border px-4 py-3 text-slate-900"
            placeholder="Enter Emp Code (example: EMP001)"
            value={empCode}
            onChange={(e) => setEmpCode(e.target.value)}
          />

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="mt-5 w-full rounded-2xl bg-yellow-500 px-6 py-3 font-semibold text-blue-950 hover:bg-yellow-400 disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate PDF"}
          </button>

          {status && (
            <p className="mt-4 text-center text-sm font-semibold text-slate-700">
              {status}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
