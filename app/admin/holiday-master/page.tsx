"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";

type ClientItem = {
  id: string;
  name: string;
  email: string;
};

type HolidayRow = {
  id: string;
  date: string;
  name: string;
  year: number;
};

export default function AdminHolidayMasterPage() {
  const today = new Date();
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [clientId, setClientId] = useState("");
  const [year, setYear] = useState(today.getFullYear());
  const [holidays, setHolidays] = useState<HolidayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const [newDate, setNewDate] = useState("");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editName, setEditName] = useState("");

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, idx) => current - 5 + idx);
  }, []);

  useEffect(() => {
    async function init() {
      const me = await fetch("/api/admin/me");
      const meData = await me.json();
      const loggedIn = meData?.data?.loggedIn ?? meData?.loggedIn ?? false;
      if (!loggedIn) {
        window.location.href = "/signin";
        return;
      }

      const res = await fetch("/api/admin/clients-list", { cache: "no-store" });
      const data = await res.json();
      const payload = data?.data ?? data;
      const list = payload.clients || [];
      setClients(list);
      if (list.length > 0) setClientId(list[0].id);
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    if (!clientId) return;
    loadHolidays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, year]);

  async function loadHolidays() {
    setStatus("Loading holidays...");
    const res = await fetch(`/api/admin/holidays?clientId=${clientId}&year=${year}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data?.message || "Failed to load holidays.");
      return;
    }
    const payload = data?.data ?? data;
    setHolidays(payload.holidays || []);
    setStatus("");
  }

  async function addHoliday() {
    if (!clientId || !newDate || !newName.trim()) {
      setStatus("Please enter holiday date and name.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        date: newDate,
        name: newName.trim(),
        year,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data?.message || "Failed to add holiday.");
      setSaving(false);
      return;
    }
    setNewDate("");
    setNewName("");
    setStatus("Holiday added.");
    await loadHolidays();
    setSaving(false);
  }

  function startEdit(item: HolidayRow) {
    setEditingId(item.id);
    setEditDate(item.date);
    setEditName(item.name);
  }

  async function saveEdit() {
    if (!editingId) return;
    if (!editDate || !editName.trim()) {
      setStatus("Please enter holiday date and name.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/admin/holidays/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: editDate,
        name: editName.trim(),
        year,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data?.message || "Failed to update holiday.");
      setSaving(false);
      return;
    }
    setEditingId(null);
    setEditDate("");
    setEditName("");
    setStatus("Holiday updated.");
    await loadHolidays();
    setSaving(false);
  }

  async function deleteHoliday(id: string) {
    const okDelete = window.confirm("Delete this holiday?");
    if (!okDelete) return;
    setSaving(true);
    const res = await fetch(`/api/admin/holidays/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data?.message || "Failed to delete holiday.");
      setSaving(false);
      return;
    }
    setStatus("Holiday deleted.");
    await loadHolidays();
    setSaving(false);
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <main className="flex-1 p-8 text-slate-900">
        <h1 className="text-3xl font-extrabold text-blue-950">Holiday Master</h1>
        <p className="mt-2 text-slate-600">
          Manage yearly holiday lists client-wise for attendance and training modules.
        </p>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          {loading ? (
            <p className="text-sm text-slate-600">Loading clients...</p>
          ) : clients.length === 0 ? (
            <p className="text-sm text-slate-600">No clients available.</p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Client</label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="mt-1 w-full rounded-xl border bg-white px-4 py-3 text-slate-900"
                  >
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} ({client.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Year</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border bg-white px-4 py-3 text-slate-900"
                  >
                    {yearOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-[200px_1fr_auto]">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="rounded-xl border bg-white px-4 py-3 text-slate-900"
                />
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Holiday name"
                  className="rounded-xl border bg-white px-4 py-3 text-slate-900"
                />
                <button
                  type="button"
                  onClick={addHoliday}
                  disabled={saving}
                  className="rounded-2xl bg-yellow-500 px-6 py-3 font-semibold text-blue-950 hover:bg-yellow-400 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-bold text-blue-950">Holiday List</h2>
          {holidays.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No holidays added for selected year.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border">
              <table className="w-full text-sm text-slate-900">
                <thead className="bg-slate-200 text-left text-slate-700">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Holiday Name</th>
                    <th className="p-3">Edit</th>
                    <th className="p-3">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.map((holiday) => {
                    const isEditing = editingId === holiday.id;
                    return (
                      <tr key={holiday.id} className="border-t">
                        <td className="p-3">
                          {isEditing ? (
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="rounded-lg border bg-white px-3 py-2 text-slate-900"
                            />
                          ) : (
                            holiday.date
                          )}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full rounded-lg border bg-white px-3 py-2 text-slate-900"
                            />
                          ) : (
                            holiday.name
                          )}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={saveEdit}
                                disabled={saving}
                                className="rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEdit(holiday)}
                              className="rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => deleteHoliday(holiday.id)}
                            className="rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-400"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {status && <p className="mt-4 text-sm font-semibold text-slate-700">{status}</p>}
        </div>
      </main>
    </div>
  );
}
