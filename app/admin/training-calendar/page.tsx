"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Mode = "reference" | "future";
type Step = 1 | 2 | 3;

type Client = {
  id: string;
  name: string;
  email: string;
};

type TrainingRow = {
  name: string;
  type: "Training" | "Committee Meeting";
  dateIso: string;
  dateLabel: string;
};

type HolidayRow = {
  dateIso: string;
  dateLabel: string;
};

type HolidayMasterRow = {
  id: string;
  date: string;
  name: string;
  year: number;
};

type CalendarResult = {
  mode: Mode;
  generatedAt: string;
  page1: TrainingRow[];
  page2: HolidayRow[];
  company: Client;
};

type GroupedTrainingRow = {
  type: "Training" | "Committee Meeting";
  name: string;
  dates: string[];
};

type Template = {
  id: string;
  title: string;
  fileUrl: string;
  group: { name: string };
  client: { id: string };
};

const templateGroups = ["Training", "Committee"] as const;
type TemplateGroup = (typeof templateGroups)[number];

export default function AdminTrainingCalendarPage() {
  const [step, setStep] = useState<Step>(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [holidayPreview, setHolidayPreview] = useState<HolidayMasterRow[]>([]);
  const [mode, setMode] = useState<Mode>("future");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateGroup, setTemplateGroup] = useState<TemplateGroup>("Training");
  const [templateFile, setTemplateFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<CalendarResult | null>(null);

  const canContinueStep1 = companyId.trim() !== "";
  const canContinueStep2 = true;
  const templatesForCompany = templates.filter((t) => t.client.id === companyId);
  const trainingCount = templatesForCompany.filter((t) => t.group.name === "Training").length;
  const committeeCount = templatesForCompany.filter(
    (t) => t.group.name === "Committee" || t.group.name === "Committees"
  ).length;
  const hasAnyTemplate = trainingCount + committeeCount > 0;

  const groupedRows: GroupedTrainingRow[] = useMemo(() => {
    if (!result) return [];
    return Object.values(
      result.page1.reduce<Record<string, GroupedTrainingRow>>((acc, row) => {
        const key = `${row.type}::${row.name}`;
        if (!acc[key]) {
          acc[key] = { type: row.type, name: row.name, dates: [] };
        }
        acc[key].dates.push(row.dateLabel);
        return acc;
      }, {})
    );
  }, [result]);

  useEffect(() => {
    async function checkLoginAndLoad() {
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
      setClients(payload.clients || []);

      const templateRes = await fetch("/api/admin/document-templates");
      const templateData = await templateRes.json();
      const templatePayload = templateData?.data ?? templateData;
      setTemplates(templatePayload.templates || []);
    }

    checkLoginAndLoad();
  }, []);

  useEffect(() => {
    if (!companyId) {
      setHolidayPreview([]);
      return;
    }

    async function loadHolidayPreview() {
      const currentYear = new Date().getFullYear();
      const res = await fetch(
        `/api/admin/holidays?clientId=${companyId}&year=${currentYear}`,
        { cache: "no-store" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setHolidayPreview([]);
        return;
      }
      const payload = data?.data ?? data;
      setHolidayPreview(payload.holidays || []);
    }

    loadHolidayPreview();
  }, [companyId]);

  async function reloadTemplates() {
    const templateRes = await fetch("/api/admin/document-templates");
    const templateData = await templateRes.json();
    const templatePayload = templateData?.data ?? templateData;
    setTemplates(templatePayload.templates || []);
  }

  async function uploadTemplate() {
    if (!companyId) {
      setStatus("Please select company in Step 1 first.");
      return;
    }
    if (!templateFile) {
      setStatus("Please choose a Word template file.");
      return;
    }
    const derivedTitle = templateFile.name.replace(/\.docx$/i, "").trim();
    if (!derivedTitle) {
      setStatus("Invalid template file name.");
      return;
    }

    const formData = new FormData();
    formData.append("clientId", companyId);
    formData.append("groupName", templateGroup);
    formData.append("title", derivedTitle);
    formData.append("file", templateFile);

    const res = await fetch("/api/admin/document-templates", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data?.message || "Template upload failed.");
      return;
    }

    setTemplateFile(null);
    await reloadTemplates();
    setStatus("Template uploaded successfully.");
  }

  async function generateCalendar() {
    setLoading(true);
    setStatus("");
    setResult(null);

    if (!hasAnyTemplate) {
      setStatus("Upload at least one Training or Committee template before generating.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/training-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          mode,
        }),
      });
      const data = await res.json();
      const payload = data?.data ?? data;

      if (!res.ok) {
        setStatus(data?.message || "Failed to generate training calendar.");
        setLoading(false);
        return;
      }

      setResult(payload as CalendarResult);
      setStatus("Training calendar generated successfully.");
    } catch {
      setStatus("Server error while generating calendar.");
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-12">
          <h1 className="text-3xl font-extrabold text-blue-950 md:text-4xl">
            Training Calendar Generator
          </h1>
          <p className="mt-2 text-slate-600">
            Step 1: Select company. Step 2: Add holidays. Step 3: Upload templates and generate.
          </p>

          <div className="mt-6 flex flex-wrap gap-2 text-sm font-semibold">
            <span
              className={`rounded-full px-4 py-2 ${
                step === 1 ? "bg-yellow-500 text-blue-950" : "bg-slate-200 text-slate-700"
              }`}
            >
              Step 1
            </span>
            <span
              className={`rounded-full px-4 py-2 ${
                step === 2 ? "bg-yellow-500 text-blue-950" : "bg-slate-200 text-slate-700"
              }`}
            >
              Step 2
            </span>
            <span
              className={`rounded-full px-4 py-2 ${
                step === 3 ? "bg-yellow-500 text-blue-950" : "bg-slate-200 text-slate-700"
              }`}
            >
              Step 3
            </span>
          </div>

          <div className="mt-8 rounded-3xl bg-white p-8 text-slate-900 shadow-md">
            {step === 1 && (
              <>
                <h2 className="text-xl font-bold text-blue-950">Step 1: Select Company</h2>

                <div className="mt-6">
                  <label className="text-sm font-semibold text-slate-700">Company</label>
                  <select
                    className="mt-1 w-full rounded-xl border bg-white px-4 py-3 text-slate-900"
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                  >
                    <option value="">-- Select Company --</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} ({client.email})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!canContinueStep1}
                  className="mt-6 rounded-2xl bg-yellow-500 px-6 py-3 font-semibold text-blue-950 hover:bg-yellow-400 disabled:opacity-50"
                >
                  Continue to Step 2
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="text-xl font-bold text-blue-950">Step 2: Provide Holiday List</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Holidays are automatically taken from Holiday Master for this client.
                </p>
                {holidayPreview.length === 0 ? (
                  <p className="mt-4 rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
                    No holidays found for current year. Add holidays in Admin {">"} Holiday Master.
                  </p>
                ) : (
                  <div className="mt-4 overflow-x-auto rounded-xl border">
                    <table className="w-full text-sm text-slate-900">
                      <thead className="bg-slate-200 text-left text-slate-700">
                        <tr>
                          <th className="p-3">Date</th>
                          <th className="p-3">Holiday Name</th>
                        </tr>
                      </thead>
                      <tbody>
                        {holidayPreview.map((holiday) => (
                          <tr key={holiday.id} className="border-t">
                            <td className="p-3">{holiday.date}</td>
                            <td className="p-3">{holiday.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-2xl bg-slate-200 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-300"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={!canContinueStep2}
                    className="rounded-2xl bg-yellow-500 px-6 py-3 font-semibold text-blue-950 hover:bg-yellow-400 disabled:opacity-50"
                  >
                    Continue to Step 3
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="text-xl font-bold text-blue-950">Step 3: Upload Templates + Generate Calendar</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Upload multiple Word templates. File name is used as training/committee name.
                </p>

                <div className="mt-6 rounded-2xl border p-4">
                  <h3 className="text-base font-bold text-blue-950">
                    Upload Word Templates (must contain placeholder {"{date}"})
                  </h3>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <select
                      value={templateGroup}
                      onChange={(e) => setTemplateGroup(e.target.value as TemplateGroup)}
                      className="rounded-xl border bg-white px-4 py-3 text-slate-900"
                    >
                      {templateGroups.map((group) => (
                        <option key={group} value={group}>
                          {group}
                        </option>
                      ))}
                    </select>
                    <input
                      type="file"
                      accept=".docx"
                      onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
                      className="rounded-xl border bg-white px-4 py-3 text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={uploadTemplate}
                      className="rounded-2xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-500"
                    >
                      Upload Template
                    </button>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                    <p>
                      Training: <b>{trainingCount}</b>
                    </p>
                    <p>
                      Committee: <b>{committeeCount}</b>
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 rounded-xl border px-4 py-3 text-slate-800">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === "reference"}
                      onChange={() => setMode("reference")}
                    />
                    Reference Mode (Last 1 year)
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border px-4 py-3 text-slate-800">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === "future"}
                      onChange={() => setMode("future")}
                    />
                    Future Mode (Next 1 year)
                  </label>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded-2xl bg-slate-200 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-300"
                  >
                    Back
                  </button>
                  <button
                    onClick={generateCalendar}
                    disabled={loading || !hasAnyTemplate}
                    className="rounded-2xl bg-yellow-500 px-6 py-3 font-semibold text-blue-950 hover:bg-yellow-400 disabled:opacity-50"
                  >
                    {loading ? "Generating..." : "Generate Calendar"}
                  </button>
                </div>
                {!hasAnyTemplate && (
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    Upload at least one `Training` or `Committee` template.
                  </p>
                )}
              </>
            )}

            {status && <p className="mt-4 text-sm font-semibold text-slate-700">{status}</p>}
          </div>

          {result && (
            <div className="mt-10 space-y-8">
              <div className="rounded-3xl bg-white p-6 text-slate-900 shadow-md">
                <h3 className="text-xl font-extrabold text-blue-950">Page 1: Training Calendar</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Company: {result.company.name} | Mode:{" "}
                  {result.mode === "reference" ? "Reference" : "Future"} | Generated:{" "}
                  {new Date(result.generatedAt).toLocaleString("en-IN")}
                </p>

                <div className="mt-4 overflow-x-auto rounded-2xl border">
                  <table className="w-full min-w-[760px] text-sm text-slate-900">
                    <thead className="bg-slate-200 text-left text-slate-700">
                      <tr>
                        <th className="p-3">Sr.</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Name</th>
                        <th className="p-3">Dates</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedRows.map((row, index) => (
                        <tr key={`${row.type}-${row.name}`} className="border-t">
                          <td className="p-3">{index + 1}</td>
                          <td className="p-3">{row.type}</td>
                          <td className="p-3 font-semibold text-blue-950">{row.name}</td>
                          <td className="p-3">{row.dates.join(", ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 text-slate-900 shadow-md">
                <h3 className="text-xl font-extrabold text-blue-950">
                  Page 2: Holidays (Excluded Dates)
                </h3>

                <div className="mt-4 overflow-x-auto rounded-2xl border">
                  <table className="w-full min-w-[480px] text-sm text-slate-900">
                    <thead className="bg-slate-200 text-left text-slate-700">
                      <tr>
                        <th className="p-3">Sr.</th>
                        <th className="p-3">Holiday Date</th>
                        <th className="p-3">ISO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.page2.map((holiday, index) => (
                        <tr key={holiday.dateIso} className="border-t">
                          <td className="p-3">{index + 1}</td>
                          <td className="p-3">{holiday.dateLabel}</td>
                          <td className="p-3">{holiday.dateIso}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
