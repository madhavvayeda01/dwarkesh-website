"use client";

import { useEffect, useState } from "react";
import ClientSidebar from "@/components/ClientSidebar";

type EventRow = {
  id: string;
  title: string;
  scheduledFor: string;
  scheduledLabel: string;
  generatedFileUrl: string | null;
};

type Props = {
  category: "TRAINING" | "COMMITTEE";
  title: string;
  helperText: string;
};

export default function ComplianceScheduleClientPage({ category, title, helperText }: Props) {
  const [events, setEvents] = useState<EventRow[]>([]);
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

      const res = await fetch(`/api/client/compliance/schedules?category=${category}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setPageDisabled(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setStatus(data?.message || "Failed to load schedules.");
        setLoading(false);
        return;
      }

      setEvents(data?.data?.events || []);
      setLoading(false);
    }

    void load();
  }, [category]);

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
      <ClientSidebar />
      <main className="flex-1 p-8 text-slate-900 dark:text-slate-100">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-black text-blue-950 dark:text-white md:text-4xl">{title}</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">{helperText}</p>

          {pageDisabled ? (
            <div className="mt-8 rounded-2xl bg-white p-6 shadow dark:bg-slate-900">
              <h2 className="text-xl font-bold text-blue-950 dark:text-white">Page Disabled</h2>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                This page is not enabled by consultant.
              </p>
            </div>
          ) : loading ? (
            <p className="mt-8 text-slate-600 dark:text-slate-300">Loading...</p>
          ) : (
            <section className="mt-8 rounded-3xl bg-white p-6 shadow-md dark:bg-slate-900">
              {status && (
                <div className="mb-5 rounded-2xl border border-blue-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {status}
                </div>
              )}

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
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
                          No generated files available yet.
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
                                className="rounded-xl bg-blue-900 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
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
          )}
        </div>
      </main>
    </div>
  );
}
