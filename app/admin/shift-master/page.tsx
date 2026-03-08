"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";

type ClientItem = {
  id: string;
  name: string;
};

type WeekendType = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN" | "ROTATIONAL";

type ShiftConfig = {
  clientId: string;
  generalShiftEnabled: boolean;
  generalShiftStart: string;
  generalShiftEnd: string;
  shiftAEnabled: boolean;
  shiftAStart: string;
  shiftAEnd: string;
  shiftBEnabled: boolean;
  shiftBStart: string;
  shiftBEnd: string;
  shiftCEnabled: boolean;
  shiftCStart: string;
  shiftCEnd: string;
  weekendType: WeekendType;
};

type PreviewEmployee = {
  employeeId: string;
  empCode: string;
  employeeName: string;
  payDays: number;
  otHoursTarget: number;
  gender: string | null;
  shiftCategory: "STAFF" | "WORKER";
  assignedShift: "G" | "A" | "B" | "C";
  weeklyOff: string;
};

const DEFAULT_CONFIG: ShiftConfig = {
  clientId: "",
  generalShiftEnabled: true,
  generalShiftStart: "09:00",
  generalShiftEnd: "17:00",
  shiftAEnabled: true,
  shiftAStart: "08:00",
  shiftAEnd: "16:00",
  shiftBEnabled: true,
  shiftBStart: "16:00",
  shiftBEnd: "00:00",
  shiftCEnabled: true,
  shiftCStart: "00:00",
  shiftCEnd: "08:00",
  weekendType: "SUN",
};

export default function AdminShiftMasterPage() {
  const now = new Date();
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [clientId, setClientId] = useState("");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [config, setConfig] = useState<ShiftConfig>(DEFAULT_CONFIG);
  const [previewRows, setPreviewRows] = useState<PreviewEmployee[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [generating, setGenerating] = useState(false);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 2, current - 1, current, current + 1, current + 2];
  }, []);

  useEffect(() => {
    async function loadClients() {
      setLoadingClients(true);
      try {
        const res = await fetch("/api/admin/clients-list", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus((data as { message?: string })?.message || "Failed to load clients.");
          setClients([]);
          return;
        }
        const payload = (data as { data?: { clients?: ClientItem[] } })?.data;
        const list = Array.isArray(payload?.clients) ? payload.clients : [];
        setClients(list);
        setClientId(list[0]?.id || "");
      } catch {
        setStatus("Failed to load clients.");
      } finally {
        setLoadingClients(false);
      }
    }
    void loadClients();
  }, []);

  useEffect(() => {
    async function loadConfig() {
      if (!clientId) return;
      setLoadingConfig(true);
      setStatus("");
      try {
        const query = new URLSearchParams({ clientId });
        const res = await fetch(`/api/admin/shift-master?${query.toString()}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus((data as { message?: string })?.message || "Failed to load shift config.");
          return;
        }
        const payload = ((data as { data?: { config?: ShiftConfig; warnings?: string[] } })?.data ||
          {}) as { config?: ShiftConfig; warnings?: string[] };
        if (payload.config) {
          setConfig({ ...payload.config, clientId });
        } else {
          setConfig({ ...DEFAULT_CONFIG, clientId });
        }
        setWarnings(Array.isArray(payload.warnings) ? payload.warnings : []);
      } catch {
        setStatus("Failed to load shift config.");
      } finally {
        setLoadingConfig(false);
      }
    }
    void loadConfig();
  }, [clientId]);

  async function loadPreview() {
    if (!clientId) {
      setStatus("Please select a client.");
      return;
    }
    setLoadingPreview(true);
    setStatus("");
    try {
      const query = new URLSearchParams({ clientId, month: String(month), year: String(year) });
      const res = await fetch(`/api/admin/in-out-generator?${query.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      const payload = (data as { data?: unknown }).data ?? data;
      if (!res.ok) {
        setStatus((data as { message?: string })?.message || "Failed to load preview.");
        setPreviewRows([]);
        return;
      }
      const rowsRaw = (payload as { employees?: unknown[] }).employees;
      const nextRows = Array.isArray(rowsRaw)
        ? rowsRaw
            .map((row) => {
              const item = row as Partial<PreviewEmployee> & { shift?: string };
              if (!item.employeeId) return null;
              return {
                employeeId: item.employeeId,
                empCode: item.empCode || "",
                employeeName: item.employeeName || "",
                payDays: Number(item.payDays || 0),
                otHoursTarget: Number(item.otHoursTarget || 0),
                gender: item.gender ?? null,
                shiftCategory: (item.shiftCategory || "WORKER") as "STAFF" | "WORKER",
                assignedShift: (item.assignedShift || item.shift || "G") as "G" | "A" | "B" | "C",
                weeklyOff: item.weeklyOff || "SUN",
              };
            })
            .filter((row): row is PreviewEmployee => Boolean(row))
        : [];
      setPreviewRows(nextRows);
      const nextWarnings = Array.isArray((payload as { warnings?: string[] }).warnings)
        ? ((payload as { warnings?: string[] }).warnings as string[])
        : [];
      setWarnings(nextWarnings);
    } catch {
      setStatus("Failed to load preview.");
      setPreviewRows([]);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function saveConfig() {
    if (!clientId) return;
    setSavingConfig(true);
    setStatus("");
    try {
      const res = await fetch("/api/admin/shift-master", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, clientId }),
      });
      const data = await res.json().catch(() => ({}));
      const payload = ((data as { data?: { config?: ShiftConfig; warnings?: string[] } })?.data ||
        {}) as { config?: ShiftConfig; warnings?: string[] };
      if (!res.ok) {
        setStatus((data as { message?: string })?.message || "Failed to save shift config.");
        return;
      }
      if (payload.config) setConfig({ ...payload.config, clientId });
      setWarnings(Array.isArray(payload.warnings) ? payload.warnings : []);
      setStatus("Shift config saved.");
    } catch {
      setStatus("Failed to save shift config.");
    } finally {
      setSavingConfig(false);
    }
  }

  async function generateAttendance() {
    if (!clientId) return;
    setGenerating(true);
    setStatus("");
    try {
      const res = await fetch("/api/admin/in-out-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, month, year }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus((data as { message?: string })?.message || "Generation failed.");
        return;
      }
      setStatus("In-out generated from Shift Master.");
      await loadPreview();
    } catch {
      setStatus("Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  function updateConfig<K extends keyof ShiftConfig>(key: K, value: ShiftConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <main className="flex-1 p-8 text-slate-900">
        <h1 className="text-3xl font-extrabold text-blue-950">Shift Master</h1>
        <p className="mt-2 text-slate-600">
          Configure client shift timings and generate IN-OUT using payroll month data.
        </p>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-bold">Filters</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-semibold text-slate-700">Client</label>
              <select
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                disabled={loadingClients}
              >
                <option value="">{loadingClients ? "Loading..." : "Select client"}</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">Month</label>
              <select
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">Year</label>
              <select
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
              >
                {yearOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={loadPreview}
                disabled={loadingPreview || !clientId}
                className="w-full rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-60"
              >
                {loadingPreview ? "Loading..." : "Load Preview"}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-bold">Shift Config</h2>
          {loadingConfig ? <p className="mt-3 text-sm text-slate-600">Loading config...</p> : null}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              G Shift Start
              <input
                type="time"
                value={config.generalShiftStart}
                onChange={(event) => updateConfig("generalShiftStart", event.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              G Shift End
              <input
                type="time"
                value={config.generalShiftEnd}
                onChange={(event) => updateConfig("generalShiftEnd", event.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </label>

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={config.shiftAEnabled}
                onChange={(event) => updateConfig("shiftAEnabled", event.target.checked)}
              />
              Enable A Shift
            </label>
            <div />
            <label className="text-sm font-semibold text-slate-700">
              A Shift Start
              <input
                type="time"
                value={config.shiftAStart}
                onChange={(event) => updateConfig("shiftAStart", event.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              A Shift End
              <input
                type="time"
                value={config.shiftAEnd}
                onChange={(event) => updateConfig("shiftAEnd", event.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </label>

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={config.shiftBEnabled}
                onChange={(event) => updateConfig("shiftBEnabled", event.target.checked)}
              />
              Enable B Shift
            </label>
            <div />
            <label className="text-sm font-semibold text-slate-700">
              B Shift Start
              <input
                type="time"
                value={config.shiftBStart}
                onChange={(event) => updateConfig("shiftBStart", event.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              B Shift End
              <input
                type="time"
                value={config.shiftBEnd}
                onChange={(event) => updateConfig("shiftBEnd", event.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </label>

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={config.shiftCEnabled}
                onChange={(event) => updateConfig("shiftCEnabled", event.target.checked)}
              />
              Enable C Shift
            </label>
            <div />
            <label className="text-sm font-semibold text-slate-700">
              C Shift Start
              <input
                type="time"
                value={config.shiftCStart}
                onChange={(event) => updateConfig("shiftCStart", event.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              C Shift End
              <input
                type="time"
                value={config.shiftCEnd}
                onChange={(event) => updateConfig("shiftCEnd", event.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Weekly Off Type
              <select
                value={config.weekendType}
                onChange={(event) => updateConfig("weekendType", event.target.value as WeekendType)}
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2"
              >
                {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN", "ROTATIONAL"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveConfig}
              disabled={savingConfig || !clientId}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {savingConfig ? "Saving..." : "Save Config"}
            </button>
            <button
              type="button"
              onClick={generateAttendance}
              disabled={generating || !clientId}
              className="rounded-xl bg-blue-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {generating ? "Generating..." : "Generate IN-OUT"}
            </button>
          </div>
        </section>

        {warnings.length > 0 ? (
          <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-bold text-amber-900">Warnings</h3>
            <ul className="mt-2 list-disc pl-6 text-sm text-amber-900">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {status ? <p className="mt-4 text-sm font-semibold text-slate-700">{status}</p> : null}

        <section className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-bold">Assignment Preview</h2>
          {loadingPreview ? <p className="mt-3 text-sm text-slate-600">Loading preview...</p> : null}
          {!loadingPreview && previewRows.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No payroll mapped employees for this month.</p>
          ) : null}
          {previewRows.length > 0 ? (
            <div className="mt-4 overflow-auto rounded-xl border">
              <table className="w-full min-w-[980px] border-collapse text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border px-3 py-2 text-left">Emp Code</th>
                    <th className="border px-3 py-2 text-left">Employee</th>
                    <th className="border px-3 py-2 text-left">Gender</th>
                    <th className="border px-3 py-2 text-left">Category</th>
                    <th className="border px-3 py-2 text-left">Assigned Shift</th>
                    <th className="border px-3 py-2 text-left">Weekly Off</th>
                    <th className="border px-3 py-2 text-left">Pay Days</th>
                    <th className="border px-3 py-2 text-left">OT Target</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={row.employeeId}>
                      <td className="border px-3 py-2">{row.empCode || "-"}</td>
                      <td className="border px-3 py-2">{row.employeeName || "-"}</td>
                      <td className="border px-3 py-2">{row.gender || "-"}</td>
                      <td className="border px-3 py-2">{row.shiftCategory}</td>
                      <td className="border px-3 py-2 font-bold text-blue-900">{row.assignedShift}</td>
                      <td className="border px-3 py-2">{row.weeklyOff}</td>
                      <td className="border px-3 py-2">{row.payDays}</td>
                      <td className="border px-3 py-2">{row.otHoursTarget}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
