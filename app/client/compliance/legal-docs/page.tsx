"use client";

import { useEffect, useMemo, useState } from "react";
import ClientSidebar from "@/components/ClientSidebar";

type LegalDoc = {
  id: string;
  name: string;
  issueDate: string | null;
  expiryDate: string;
  remarks: string | null;
  status: {
    label: string;
    tone: "active" | "warning" | "expired";
    days: number;
  };
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

function toneClass(tone: LegalDoc["status"]["tone"]) {
  if (tone === "expired") return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200";
  if (tone === "warning") return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200";
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200";
}

export default function ClientComplianceLegalDocsPage() {
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageDisabled, setPageDisabled] = useState(false);

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/client/me", { cache: "no-store" });
      const meData = await meRes.json().catch(() => ({}));
      const loggedIn = meData?.data?.loggedIn ?? meData?.loggedIn ?? false;
      if (!loggedIn) {
        window.location.assign("/signin");
        return;
      }

      const res = await fetch("/api/client/compliance/legal-docs", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setPageDisabled(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setStatus(data?.message || "Failed to load legal documents.");
        setLoading(false);
        return;
      }

      setDocs(data?.data?.documents || []);
      setLoading(false);
    }

    void load();
  }, []);

  const summary = useMemo(() => ({
    total: docs.length,
    expiring: docs.filter((doc) => doc.status.tone === "warning").length,
    expired: docs.filter((doc) => doc.status.tone === "expired").length,
  }), [docs]);

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
      <ClientSidebar />
      <main className="flex-1 p-8 text-slate-900 dark:text-slate-100">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-black text-blue-950 dark:text-white md:text-4xl">Compliance Legal Doc</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Review required legal documents, their expiry status, and upcoming renewal deadlines.
          </p>

          {pageDisabled ? (
            <div className="mt-8 rounded-2xl bg-white p-6 shadow dark:bg-slate-900">
              <h2 className="text-xl font-bold text-blue-950 dark:text-white">Page Disabled</h2>
              <p className="mt-2 text-slate-600 dark:text-slate-300">This page is not enabled by consultant.</p>
            </div>
          ) : loading ? (
            <p className="mt-8 text-slate-600 dark:text-slate-300">Loading...</p>
          ) : (
            <>
              <section className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl bg-white p-5 shadow-md dark:bg-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Total Documents</p>
                  <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{summary.total}</p>
                </div>
                <div className="rounded-3xl bg-white p-5 shadow-md dark:bg-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Expiring Soon</p>
                  <p className="mt-3 text-3xl font-black text-amber-700 dark:text-amber-200">{summary.expiring}</p>
                </div>
                <div className="rounded-3xl bg-white p-5 shadow-md dark:bg-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Expired</p>
                  <p className="mt-3 text-3xl font-black text-red-700 dark:text-red-200">{summary.expired}</p>
                </div>
              </section>

              {status && (
                <div className="mt-6 rounded-2xl border border-blue-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  {status}
                </div>
              )}

              <section className="mt-6 overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-900">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <tr>
                      <th className="px-4 py-3">Document</th>
                      <th className="px-4 py-3">Issue Date</th>
                      <th className="px-4 py-3">Expiry Date</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {docs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-5 text-slate-500 dark:text-slate-400">No legal documents are registered yet.</td>
                      </tr>
                    ) : (
                      docs.map((doc) => (
                        <tr key={doc.id}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900 dark:text-white">{doc.name}</p>
                            {doc.remarks ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{doc.remarks}</p> : null}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatDate(doc.issueDate)}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatDate(doc.expiryDate)}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${toneClass(doc.status.tone)}`}>
                              {doc.status.label}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
