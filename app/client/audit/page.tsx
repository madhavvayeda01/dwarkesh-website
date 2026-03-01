"use client";

import { useEffect, useState } from "react";
import ClientSidebar from "@/components/ClientSidebar";

type GeneratedFile = {
  name: string;
  fileUrl: string;
  updatedAt: string | null;
};

export default function ClientAuditPage() {
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [moduleEnabled, setModuleEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkLoginAndLoad() {
      const me = await fetch("/api/client/me");
      const meData = await me.json();
      const loggedIn = meData?.data?.loggedIn ?? meData?.loggedIn ?? false;
      if (!loggedIn) {
        window.location.href = "/signin";
        return;
      }
      const accessRes = await fetch("/api/client/modules?page=audit_dashboard", { cache: "no-store" });
      const accessData = await accessRes.json().catch(() => ({}));
      if (accessRes.ok && accessData?.data?.enabled === false) {
        setModuleEnabled(false);
        return;
      }
      setModuleEnabled(true);

      const res = await fetch("/api/client/generated-files?module=audit");
      const data = await res.json();
      setFiles((data?.data ?? data)?.files || []);
    }

    checkLoginAndLoad();
  }, []);

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
        <h1 className="text-2xl font-bold text-blue-950">Audit Module</h1>
        <p className="mt-1 text-slate-600">Audit-related generated files from admin templates.</p>

        <div className="mt-6 rounded-2xl bg-white p-6 text-slate-900 shadow">
          {files.length === 0 ? (
            <p className="text-sm text-slate-600">No audit files available yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm text-slate-900">
                <thead className="bg-slate-200 text-left text-slate-700">
                  <tr>
                    <th className="p-3">File Name</th>
                    <th className="p-3">Updated</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
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



