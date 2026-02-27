"use client";

import Sidebar from "@/components/Sidebar";
import { useEffect, useMemo, useState } from "react";

type Lead = {
  id: string;
  fullName: string;
  companyName: string | null;
  email: string | null;
  phone: string;
  message: string | null;
  createdAt: string;
};

export default function AdminPage() {
  // 🔐 Login check
  useEffect(() => {
    async function checkLogin() {
      const res = await fetch("/api/admin/me");
      const data = await res.json();
      const loggedIn = data?.data?.loggedIn ?? data?.loggedIn ?? false;

      if (!loggedIn) {
        window.location.href = "/signin";
      }
    }

    checkLogin();
  }, []);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "today" | "week">("all");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Popup
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  async function fetchLeads(currentPage = page) {
    setLoading(true);

    const res = await fetch(
      `/api/admin/leads?page=${currentPage}&pageSize=${pageSize}`
    );
    const data = await res.json();
    const payload = data?.data ?? data;

    setLeads(payload.leads || []);
    setTotal(payload.total || 0);
    setTotalPages(payload.totalPages || 1);

    setLoading(false);
  }

  useEffect(() => {
    fetchLeads(page);
  }, [page]);

  const filteredLeads = useMemo(() => {
    let list = [...leads];

    const now = new Date();

    if (filter === "today") {
      list = list.filter((l) => {
        const d = new Date(l.createdAt);
        return (
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      });
    }

    if (filter === "week") {
      const last7 = new Date();
      last7.setDate(now.getDate() - 7);
      list = list.filter((l) => new Date(l.createdAt) >= last7);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((l) => {
        return (
          l.fullName.toLowerCase().includes(q) ||
          (l.companyName || "").toLowerCase().includes(q) ||
          (l.email || "").toLowerCase().includes(q) ||
          l.phone.toLowerCase().includes(q) ||
          (l.message || "").toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [leads, search, filter]);

  async function handleDelete(id: string) {
    const ok = confirm("Delete this enquiry?");
    if (!ok) return;

    const res = await fetch(`/api/admin/leads/${id}`, { method: "DELETE" });

    if (res.ok) {
      fetchLeads(page);
    } else {
      alert("Failed to delete enquiry");
    }
  }

  function exportCSV() {
    const headers = ["Name", "Company", "Email", "Phone", "Message", "Date"];

    const rows = filteredLeads.map((l) => [
      l.fullName,
      l.companyName || "-",
      l.email || "-",
      l.phone,
      (l.message || "-").replace(/\n/g, " "),
      new Date(l.createdAt).toLocaleString(),
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `enquiries_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/signin";
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-blue-950 md:text-4xl">
                Admin Panel
              </h1>
              <p className="mt-2 text-slate-600">
                All enquiries submitted from the website will appear here.
              </p>
            </div>

            <button
              onClick={logout}
              className="rounded-2xl bg-red-500 px-5 py-2 font-semibold text-white hover:bg-red-400"
            >
              Logout
            </button>
          </div>

          <div className="mt-8 rounded-3xl bg-white p-6 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-blue-950">
                Total Enquiries: {total}
              </h2>

              <div className="flex flex-wrap gap-3">
                <input
                  className="rounded-xl border px-4 py-2 text-sm"
                  placeholder="Search name / email / phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <select
                  className="rounded-xl border px-4 py-2 text-sm"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                >
                  <option value="all">All</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 days</option>
                </select>

                <button
                  onClick={exportCSV}
                  className="rounded-2xl bg-yellow-500 px-5 py-2 text-sm font-semibold text-blue-950 hover:bg-yellow-400"
                >
                  Export CSV
                </button>

                <button
                  onClick={() => fetchLeads(page)}
                  className="rounded-2xl bg-blue-900 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <p className="mt-6 text-slate-600">Loading enquiries...</p>
            ) : filteredLeads.length === 0 ? (
              <p className="mt-6 text-slate-600">No enquiries found.</p>
            ) : (
              <>
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-200 text-left text-slate-700">
                        <th className="p-3">Name</th>
                        <th className="p-3">Company</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">Message</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredLeads.map((lead) => (
                        <tr
                          key={lead.id}
                          className="border-b hover:bg-slate-50"
                        >
                          <td className="p-3 font-semibold text-blue-950">
                            {lead.fullName}
                          </td>
                          <td className="p-3 text-slate-700">
                            {lead.companyName || "-"}
                          </td>
                          <td className="p-3 text-slate-700">
                            {lead.email || "-"}
                          </td>
                          <td className="p-3 text-slate-700">{lead.phone}</td>

                          <td className="p-3 text-slate-700">
                            {lead.message ? (
                              <button
                                onClick={() => setSelectedLead(lead)}
                                className="rounded-xl bg-slate-200 px-3 py-1 text-xs font-semibold text-blue-950 hover:bg-slate-300"
                              >
                                View
                              </button>
                            ) : (
                              "-"
                            )}
                          </td>

                          <td className="p-3 text-slate-600">
                            {new Date(lead.createdAt).toLocaleString()}
                          </td>

                          <td className="p-3">
                            <button
                              onClick={() => handleDelete(lead.id)}
                              className="rounded-xl bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-400"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="mt-6 flex items-center justify-between">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                  >
                    Prev
                  </button>

                  <p className="text-sm font-semibold text-slate-700">
                    Page {page} of {totalPages}
                  </p>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Popup */}
        {selectedLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
              <h2 className="text-xl font-bold text-blue-950">Full Message</h2>

              <p className="mt-2 text-sm text-slate-600">
                From:{" "}
                <span className="font-semibold">{selectedLead.fullName}</span>
              </p>

              <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-100 p-4 text-sm text-slate-700">
                {selectedLead.message || "-"}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedLead(null)}
                  className="rounded-2xl bg-slate-200 px-5 py-2 font-semibold text-slate-700 hover:bg-slate-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
