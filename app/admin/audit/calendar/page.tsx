"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AuditChecklistSource,
  AuditMode,
  AuditPriority,
  AuditScheduleStatus,
  AuditVisitStatus,
} from "@prisma/client";
import Sidebar from "@/components/Sidebar";

type ViewMode = "calendar" | "agenda" | "board";

type SummaryData = {
  today: number;
  upcoming7Days: number;
  overdue: number;
  completedThisMonth: number;
};

type ClientLookup = { id: string; name: string; email: string };
type ConsultantLookup = { id: string; name: string; email: string; active: boolean };
type ProgramAuditLookup = { id: string; name: string };
type AttachmentItem = { id: string; visitId: string | null; fileName: string; fileUrl: string; createdAt: string };
type ChecklistItem = {
  id: string;
  visitId: string | null;
  source: AuditChecklistSource;
  label: string;
  details: string | null;
  completed: boolean;
  notes: string | null;
};
type ReminderItem = { id: string; kind: string; title: string; message: string; notifyAt: string; emailStatus: string };
type VisitItem = {
  id: string;
  title: string;
  purpose: string | null;
  plannedStartAt: string;
  plannedEndAt: string | null;
  location: string | null;
  contactPerson: string | null;
  status: AuditVisitStatus;
  notes: string | null;
  outcome: string | null;
};
type ScheduleItem = {
  id: string;
  client: ClientLookup;
  programAudit: ProgramAuditLookup | null;
  ownerConsultant: ConsultantLookup | null;
  title: string;
  description: string | null;
  status: AuditScheduleStatus;
  priority: AuditPriority;
  mode: AuditMode;
  location: string | null;
  scheduledStartAt: string;
  scheduledStartLabel: string | null;
  scheduledEndAt: string | null;
  followUpAt: string | null;
  counts: { visits: number; checklistItems: number; attachments: number };
};
type ScheduleDetail = Omit<ScheduleItem, "counts"> & {
  internalNotes: string | null;
  outcomeSummary: string | null;
  visits: VisitItem[];
  checklistItems: ChecklistItem[];
  attachments: AttachmentItem[];
  reminders: ReminderItem[];
};
type Lookups = {
  clients: ClientLookup[];
  consultants: ConsultantLookup[];
  programAudits: ProgramAuditLookup[];
  statuses: AuditScheduleStatus[];
  priorities: AuditPriority[];
  modes: AuditMode[];
};

type FiltersState = {
  clientId: string;
  status: string;
  ownerConsultantId: string;
  priority: string;
  from: string;
  to: string;
  search: string;
};

type ScheduleFormState = {
  clientId: string;
  programAuditId: string;
  title: string;
  description: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  priority: AuditPriority;
  mode: AuditMode;
  location: string;
  ownerConsultantId: string;
  followUpAt: string;
  internalNotes: string;
  outcomeSummary: string;
  status: AuditScheduleStatus;
};

type VisitFormState = {
  title: string;
  purpose: string;
  plannedStartAt: string;
  plannedEndAt: string;
  location: string;
  contactPerson: string;
  notes: string;
  outcome: string;
  status: AuditVisitStatus;
};

const EMPTY_SUMMARY: SummaryData = { today: 0, upcoming7Days: 0, overdue: 0, completedThisMonth: 0 };
const EMPTY_LOOKUPS: Lookups = {
  clients: [],
  consultants: [],
  programAudits: [],
  statuses: Object.values(AuditScheduleStatus),
  priorities: Object.values(AuditPriority),
  modes: Object.values(AuditMode),
};
const EMPTY_FILTERS: FiltersState = {
  clientId: "",
  status: "",
  ownerConsultantId: "",
  priority: "",
  from: "",
  to: "",
  search: "",
};
const EMPTY_SCHEDULE_FORM: ScheduleFormState = {
  clientId: "",
  programAuditId: "",
  title: "",
  description: "",
  scheduledStartAt: "",
  scheduledEndAt: "",
  priority: AuditPriority.MEDIUM,
  mode: AuditMode.ONSITE,
  location: "",
  ownerConsultantId: "",
  followUpAt: "",
  internalNotes: "",
  outcomeSummary: "",
  status: AuditScheduleStatus.SCHEDULED,
};
const EMPTY_VISIT_FORM: VisitFormState = {
  title: "",
  purpose: "",
  plannedStartAt: "",
  plannedEndAt: "",
  location: "",
  contactPerson: "",
  notes: "",
  outcome: "",
  status: AuditVisitStatus.PLANNED,
};

const STATUS_LABELS: Record<AuditScheduleStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  VISIT_PLANNED: "Visit Planned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  RESCHEDULED: "Rescheduled",
  CANCELLED: "Cancelled",
  OVERDUE: "Overdue",
};
const STATUS_TONES: Record<AuditScheduleStatus, string> = {
  DRAFT: "bg-slate-200 text-slate-700",
  SCHEDULED: "bg-blue-100 text-blue-800",
  VISIT_PLANNED: "bg-indigo-100 text-indigo-800",
  IN_PROGRESS: "bg-amber-100 text-amber-900",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  RESCHEDULED: "bg-fuchsia-100 text-fuchsia-800",
  CANCELLED: "bg-rose-100 text-rose-800",
  OVERDUE: "bg-red-100 text-red-800",
};
const PRIORITY_TONES: Record<AuditPriority, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};
const VISIT_STATUS_LABELS: Record<AuditVisitStatus, string> = {
  PLANNED: "Planned",
  DONE: "Done",
  MISSED: "Missed",
  RESCHEDULED: "Rescheduled",
  CANCELLED: "Cancelled",
};
const CHECKLIST_LABELS: Record<AuditChecklistSource, string> = {
  PARAMETER: "Parameters",
  DOCUMENT: "Documents",
  FLOOR: "Floor Requirements",
  MANUAL: "Manual",
};

function parseJson(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fetchJson(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, init);
  const text = await res.text();
  return { res, json: parseJson(text) };
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateTimeLocalValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function monthGrid(date: Date) {
  const start = monthStart(date);
  const offset = (start.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(date.getFullYear(), date.getMonth(), index - offset + 1);
    return {
      date: cellDate,
      inMonth: cellDate.getMonth() === date.getMonth(),
      key: cellDate.toISOString().slice(0, 10),
    };
  });
}

function dateMatches(iso: string, date: Date) {
  const parsed = new Date(iso);
  return parsed.getFullYear() === date.getFullYear() && parsed.getMonth() === date.getMonth() && parsed.getDate() === date.getDate();
}

function defaultCellStart(date: Date) {
  return toDateTimeLocalValue(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10, 0).toISOString());
}

export default function AuditCalendarPage() {
  const [view, setView] = useState<ViewMode>("calendar");
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
  const [cursor, setCursor] = useState(monthStart(new Date()));
  const [summary, setSummary] = useState<SummaryData>(EMPTY_SUMMARY);
  const [lookups, setLookups] = useState<Lookups>(EMPTY_LOOKUPS);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<ScheduleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<"create" | "edit">("create");
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>(EMPTY_SCHEDULE_FORM);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [visitForm, setVisitForm] = useState<VisitFormState>(EMPTY_VISIT_FORM);
  const [editingVisitId, setEditingVisitId] = useState("");
  const [savingVisit, setSavingVisit] = useState(false);
  const [manualChecklist, setManualChecklist] = useState({ label: "", details: "" });
  const [checklistDrafts, setChecklistDrafts] = useState<Record<string, { notes: string; visitId: string }>>({});
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentVisitId, setAttachmentVisitId] = useState("");
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [statusDraft, setStatusDraft] = useState<AuditScheduleStatus>(AuditScheduleStatus.SCHEDULED);

  const grid = useMemo(() => monthGrid(cursor), [cursor]);
  const groupedChecklist = useMemo(() => {
    const next: Partial<Record<AuditChecklistSource, ChecklistItem[]>> = {};
    (detail?.checklistItems || []).forEach((item) => {
      if (!next[item.source]) next[item.source] = [];
      next[item.source]!.push(item);
    });
    return next;
  }, [detail]);

  const board = useMemo(() => {
    const next: Record<AuditScheduleStatus, ScheduleItem[]> = {
      DRAFT: [],
      SCHEDULED: [],
      VISIT_PLANNED: [],
      IN_PROGRESS: [],
      COMPLETED: [],
      RESCHEDULED: [],
      CANCELLED: [],
      OVERDUE: [],
    };
    schedules.forEach((schedule) => next[schedule.status].push(schedule));
    return next;
  }, [schedules]);

  const loadDetail = useCallback(async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    const { res, json } = await fetchJson(`/api/admin/audit-calendar/${id}`, { cache: "no-store" });
    if (res.status === 401) {
      window.location.assign("/signin");
      return;
    }
    if (!res.ok) {
      setStatus(json?.message || "Failed to load audit details.");
      setDetail(null);
      setDetailLoading(false);
      return;
    }
    const payload = (json?.data ?? json)?.schedule as ScheduleDetail;
    setDetail(payload);
    setStatusDraft(payload.status);
    setChecklistDrafts(
      Object.fromEntries(
        payload.checklistItems.map((item) => [item.id, { notes: item.notes || "", visitId: item.visitId || "" }])
      )
    );
    setDetailLoading(false);
  }, []);

  const loadSchedules = useCallback(async (nextSelectedId = selectedId) => {
    setLoading(true);
    const params = new URLSearchParams({ view });
    if (filters.clientId) params.set("clientId", filters.clientId);
    if (filters.status) params.set("status", filters.status);
    if (filters.ownerConsultantId) params.set("ownerConsultantId", filters.ownerConsultantId);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.search) params.set("search", filters.search);
    if (filters.from) params.set("from", `${filters.from}T00:00`);
    if (filters.to) params.set("to", `${filters.to}T23:59`);
    if (view === "calendar" && !filters.from && !filters.to) {
      params.set("from", `${monthStart(cursor).toISOString().slice(0, 10)}T00:00`);
      params.set("to", `${monthEnd(cursor).toISOString().slice(0, 10)}T23:59`);
    }
    const { res, json } = await fetchJson(`/api/admin/audit-calendar?${params.toString()}`, { cache: "no-store" });
    if (res.status === 401) {
      window.location.assign("/signin");
      return;
    }
    if (!res.ok) {
      setStatus(json?.message || "Failed to load audit calendar.");
      setLoading(false);
      return;
    }
    const payload = json?.data ?? json;
    const nextSchedules = (payload?.schedules || []) as ScheduleItem[];
    setSummary(payload?.summary || EMPTY_SUMMARY);
    setLookups(payload?.lookups || EMPTY_LOOKUPS);
    setSchedules(nextSchedules);
    setLoading(false);
    if (nextSelectedId && nextSchedules.some((item) => item.id === nextSelectedId)) {
      void loadDetail(nextSelectedId);
    } else if (nextSelectedId) {
      setSelectedId("");
      setDetail(null);
    }
  }, [cursor, filters.clientId, filters.from, filters.ownerConsultantId, filters.priority, filters.search, filters.status, filters.to, loadDetail, selectedId, view]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  function openCreate(prefill?: Date) {
    setComposerMode("create");
    setScheduleForm({
      ...EMPTY_SCHEDULE_FORM,
      clientId: lookups.clients[0]?.id || "",
      scheduledStartAt: prefill ? defaultCellStart(prefill) : "",
    });
    setComposerOpen(true);
  }

  function openEdit() {
    if (!detail) return;
    setComposerMode("edit");
    setScheduleForm({
      clientId: detail.client.id,
      programAuditId: detail.programAudit?.id || "",
      title: detail.title,
      description: detail.description || "",
      scheduledStartAt: toDateTimeLocalValue(detail.scheduledStartAt),
      scheduledEndAt: toDateTimeLocalValue(detail.scheduledEndAt),
      priority: detail.priority,
      mode: detail.mode,
      location: detail.location || "",
      ownerConsultantId: detail.ownerConsultant?.id || "",
      followUpAt: toDateTimeLocalValue(detail.followUpAt),
      internalNotes: detail.internalNotes || "",
      outcomeSummary: detail.outcomeSummary || "",
      status: detail.status,
    });
    setComposerOpen(true);
  }

  async function saveSchedule() {
    if (!scheduleForm.clientId || !scheduleForm.title.trim() || !scheduleForm.scheduledStartAt) {
      setStatus("Client, title, and schedule start are required.");
      return;
    }
    setSavingSchedule(true);
    const endpoint = composerMode === "create" ? "/api/admin/audit-calendar" : `/api/admin/audit-calendar/${selectedId}`;
    const method = composerMode === "create" ? "POST" : "PATCH";
    const { res, json } = await fetchJson(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: scheduleForm.clientId,
        programAuditId: scheduleForm.programAuditId || null,
        title: scheduleForm.title.trim(),
        description: scheduleForm.description || null,
        scheduledStartAt: scheduleForm.scheduledStartAt,
        scheduledEndAt: scheduleForm.scheduledEndAt || null,
        priority: scheduleForm.priority,
        mode: scheduleForm.mode,
        location: scheduleForm.location || null,
        ownerConsultantId: scheduleForm.ownerConsultantId || null,
        followUpAt: scheduleForm.followUpAt || null,
        internalNotes: scheduleForm.internalNotes || null,
        ...(composerMode === "edit"
          ? { status: scheduleForm.status, outcomeSummary: scheduleForm.outcomeSummary || null }
          : {}),
      }),
    });
    if (!res.ok) {
      setStatus(json?.message || "Failed to save audit schedule.");
      setSavingSchedule(false);
      return;
    }
    const nextId = (json?.data ?? json)?.schedule?.id || selectedId;
    setComposerOpen(false);
    setSavingSchedule(false);
    setStatus(composerMode === "create" ? "Audit scheduled." : "Audit updated.");
    await loadSchedules(nextId);
  }

  async function removeSchedule() {
    if (!selectedId) return;
    if (!window.confirm("Delete this audit schedule and all linked visits/files?")) return;
    const { res, json } = await fetchJson(`/api/admin/audit-calendar/${selectedId}`, { method: "DELETE" });
    if (!res.ok) {
      setStatus(json?.message || "Failed to delete audit schedule.");
      return;
    }
    setStatus("Audit schedule deleted.");
    setSelectedId("");
    setDetail(null);
    await loadSchedules("");
  }

  async function saveStatus() {
    if (!selectedId) return;
    const { res, json } = await fetchJson(`/api/admin/audit-calendar/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: statusDraft }),
    });
    if (!res.ok) {
      setStatus(json?.message || "Failed to update status.");
      return;
    }
    setStatus("Schedule status updated.");
    await loadSchedules(selectedId);
  }

  async function saveVisit() {
    if (!selectedId || !visitForm.title.trim() || !visitForm.plannedStartAt) {
      setStatus("Visit title and start are required.");
      return;
    }
    setSavingVisit(true);
    const endpoint = editingVisitId
      ? `/api/admin/audit-calendar/visits/${editingVisitId}`
      : `/api/admin/audit-calendar/${selectedId}/visits`;
    const method = editingVisitId ? "PATCH" : "POST";
    const { res, json } = await fetchJson(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: visitForm.title.trim(),
        purpose: visitForm.purpose || null,
        plannedStartAt: visitForm.plannedStartAt,
        plannedEndAt: visitForm.plannedEndAt || null,
        location: visitForm.location || null,
        contactPerson: visitForm.contactPerson || null,
        notes: visitForm.notes || null,
        outcome: visitForm.outcome || null,
        ...(editingVisitId ? { status: visitForm.status } : {}),
      }),
    });
    if (!res.ok) {
      setStatus(json?.message || "Failed to save visit.");
      setSavingVisit(false);
      return;
    }
    setSavingVisit(false);
    setEditingVisitId("");
    setVisitForm(EMPTY_VISIT_FORM);
    setStatus(editingVisitId ? "Visit updated." : "Visit added.");
    await loadSchedules(selectedId);
  }

  async function removeVisit(visitId: string) {
    if (!window.confirm("Delete this visit?")) return;
    const { res, json } = await fetchJson(`/api/admin/audit-calendar/visits/${visitId}`, { method: "DELETE" });
    if (!res.ok) {
      setStatus(json?.message || "Failed to delete visit.");
      return;
    }
    setStatus("Visit deleted.");
    if (editingVisitId === visitId) {
      setEditingVisitId("");
      setVisitForm(EMPTY_VISIT_FORM);
    }
    await loadSchedules(selectedId);
  }

  async function addManualItem() {
    if (!selectedId || !manualChecklist.label.trim()) {
      setStatus("Manual checklist label is required.");
      return;
    }
    const { res, json } = await fetchJson(`/api/admin/audit-calendar/${selectedId}/checklist/manual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: manualChecklist.label.trim(),
        details: manualChecklist.details || null,
      }),
    });
    if (!res.ok) {
      setStatus(json?.message || "Failed to add checklist item.");
      return;
    }
    setManualChecklist({ label: "", details: "" });
    setStatus("Manual checklist item added.");
    await loadSchedules(selectedId);
  }

  async function patchChecklist(itemId: string, body: Record<string, unknown>) {
    const { res, json } = await fetchJson(`/api/admin/audit-calendar/checklist/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setStatus(json?.message || "Failed to update checklist item.");
      return;
    }
    setStatus("Checklist updated.");
    await loadSchedules(selectedId);
  }

  async function removeChecklist(itemId: string) {
    if (!window.confirm("Delete this manual checklist item?")) return;
    const { res, json } = await fetchJson(`/api/admin/audit-calendar/checklist/${itemId}`, { method: "DELETE" });
    if (!res.ok) {
      setStatus(json?.message || "Failed to delete checklist item.");
      return;
    }
    setStatus("Checklist item deleted.");
    await loadSchedules(selectedId);
  }

  async function uploadAttachment() {
    if (!selectedId || !attachmentFile) {
      setStatus("Choose a file before uploading.");
      return;
    }
    setUploadingAttachment(true);
    const formData = new FormData();
    formData.append("file", attachmentFile);
    if (attachmentVisitId) formData.append("visitId", attachmentVisitId);
    const { res, json } = await fetchJson(`/api/admin/audit-calendar/${selectedId}/attachments`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      setStatus(json?.message || "Failed to upload attachment.");
      setUploadingAttachment(false);
      return;
    }
    setAttachmentFile(null);
    setAttachmentVisitId("");
    setUploadingAttachment(false);
    setStatus("Attachment uploaded.");
    await loadSchedules(selectedId);
  }

  async function removeAttachment(attachmentId: string) {
    if (!window.confirm("Delete this attachment?")) return;
    const { res, json } = await fetchJson(`/api/admin/audit-calendar/attachments/${attachmentId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setStatus(json?.message || "Failed to delete attachment.");
      return;
    }
    setStatus("Attachment deleted.");
    await loadSchedules(selectedId);
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <main className="flex-1 px-6 py-8 text-slate-900">
        <div className="mx-auto max-w-[1480px]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Audit Module</p>
              <h1 className="mt-2 text-3xl font-black text-blue-950 md:text-4xl">Audit Calendar</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                Schedule audits, plan visits, manage checklists, upload evidence, and track reminders across all clients.
              </p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => openCreate()} className="rounded-2xl bg-[#f7c63d] px-5 py-3 font-bold text-slate-950 hover:bg-[#ffd457]">
                New Audit
              </button>
              <button type="button" onClick={() => void loadSchedules()} className="rounded-2xl border border-slate-300 px-5 py-3 font-bold text-slate-700 hover:bg-slate-50">
                Refresh
              </button>
            </div>
          </div>

          {status && <div className="mt-6 rounded-3xl border border-blue-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow">{status}</div>}

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Today" value={summary.today} tone="blue" />
            <StatCard label="Upcoming 7 Days" value={summary.upcoming7Days} tone="amber" />
            <StatCard label="Overdue" value={summary.overdue} tone="rose" />
            <StatCard label="Completed This Month" value={summary.completedThisMonth} tone="emerald" />
          </section>

          <section className="mt-6 rounded-3xl bg-white p-6 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Filters</p>
                <h2 className="mt-2 text-xl font-black text-blue-950">Search And Narrow</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["calendar", "agenda", "board"] as ViewMode[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setView(item)}
                    className={`rounded-2xl px-4 py-2 text-sm font-bold ${view === item ? "bg-blue-900 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
                  >
                    {item[0].toUpperCase() + item.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <select value={filters.clientId} onChange={(e) => setFilters((p) => ({ ...p, clientId: e.target.value }))} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900">
                <option value="">All clients</option>
                {lookups.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
              <select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900">
                <option value="">All statuses</option>
                {lookups.statuses.map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}
              </select>
              <select value={filters.ownerConsultantId} onChange={(e) => setFilters((p) => ({ ...p, ownerConsultantId: e.target.value }))} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900">
                <option value="">All owners</option>
                <option value="__unassigned__">Unassigned</option>
                {lookups.consultants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <select value={filters.priority} onChange={(e) => setFilters((p) => ({ ...p, priority: e.target.value }))} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900">
                <option value="">All priorities</option>
                {lookups.priorities.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <input type="date" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" />
              <input type="date" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" />
              <input value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} placeholder="Search audit, client, notes, location" className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 md:col-span-2" />
              <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                Clear Filters
              </button>
            </div>
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
            <div className="space-y-6">
              {loading ? (
                <div className="rounded-3xl bg-white p-8 text-sm font-semibold text-slate-500 shadow-md">Loading audit calendar...</div>
              ) : view === "calendar" ? (
                <div className="rounded-3xl bg-white p-6 shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl font-black text-blue-950">{cursor.toLocaleString("en-IN", { month: "long", year: "numeric" })}</h2>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Previous</button>
                      <button type="button" onClick={() => setCursor(monthStart(new Date()))} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Current</button>
                      <button type="button" onClick={() => setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Next</button>
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((item) => <div key={item} className="rounded-2xl bg-slate-50 px-3 py-2">{item}</div>)}
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-7">
                    {grid.map((cell) => {
                      const dayItems = schedules.filter((schedule) => dateMatches(schedule.scheduledStartAt, cell.date));
                      return (
                        <button key={cell.key} type="button" onClick={() => openCreate(cell.date)} className={`min-h-[170px] rounded-3xl border p-3 text-left ${cell.inMonth ? "border-slate-200 bg-white hover:border-blue-300" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
                          <div className="flex items-center justify-between"><span className="text-sm font-black">{cell.date.getDate()}</span><span className="text-[11px] font-semibold uppercase tracking-[0.18em]">{cell.inMonth ? "Add" : ""}</span></div>
                          <div className="mt-3 space-y-2">
                            {dayItems.slice(0, 4).map((schedule) => (
                              <button key={schedule.id} type="button" onClick={(event) => { event.stopPropagation(); void loadDetail(schedule.id); }} className={`w-full rounded-2xl px-3 py-2 text-left text-xs font-bold ${STATUS_TONES[schedule.status]}`}>
                                <div className="truncate">{schedule.title}</div>
                                <div className="mt-1 truncate text-[11px] opacity-75">{schedule.client.name}</div>
                              </button>
                            ))}
                            {dayItems.length > 4 && <div className="text-xs font-semibold text-slate-500">+{dayItems.length - 4} more</div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : view === "agenda" ? (
                <div className="rounded-3xl bg-white p-6 shadow-md">
                  <div className="overflow-x-auto rounded-3xl border border-slate-200">
                    <table className="w-full min-w-[920px] text-sm">
                      <thead className="bg-slate-100 text-left text-slate-600"><tr><th className="px-4 py-3">Audit</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Schedule</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Owner</th></tr></thead>
                      <tbody>
                        {schedules.map((schedule) => (
                          <tr key={schedule.id} onClick={() => void loadDetail(schedule.id)} className={`cursor-pointer border-t hover:bg-slate-50 ${selectedId === schedule.id ? "bg-blue-50/60" : ""}`}>
                            <td className="px-4 py-4"><p className="font-bold text-blue-950">{schedule.title}</p><p className="mt-1 text-xs text-slate-500">{schedule.programAudit?.name || "Custom audit"}</p></td>
                            <td className="px-4 py-4">{schedule.client.name}</td>
                            <td className="px-4 py-4">{formatDateTime(schedule.scheduledStartAt)}</td>
                            <td className="px-4 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONES[schedule.status]}`}>{STATUS_LABELS[schedule.status]}</span></td>
                            <td className="px-4 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${PRIORITY_TONES[schedule.priority]}`}>{schedule.priority}</span></td>
                            <td className="px-4 py-4">{schedule.ownerConsultant?.name || "Unassigned"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl bg-white p-6 shadow-md">
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {Object.values(AuditScheduleStatus).map((col) => (
                      <div key={col} className="min-w-[280px] rounded-3xl bg-slate-50 p-4">
                        <div className="flex items-center justify-between"><span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONES[col]}`}>{STATUS_LABELS[col]}</span><span className="text-xs font-bold text-slate-500">{board[col].length}</span></div>
                        <div className="mt-4 space-y-3">
                          {board[col].map((schedule) => (
                            <button key={schedule.id} type="button" onClick={() => void loadDetail(schedule.id)} className={`w-full rounded-2xl bg-white p-4 text-left shadow-sm hover:shadow ${selectedId === schedule.id ? "ring-2 ring-blue-300" : ""}`}>
                              <p className="font-bold text-blue-950">{schedule.title}</p>
                              <p className="mt-1 text-sm text-slate-600">{schedule.client.name}</p>
                              <p className="mt-3 text-xs text-slate-500">{formatDateTime(schedule.scheduledStartAt)}</p>
                            </button>
                          ))}
                          {board[col].length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-400">No records</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <aside className="space-y-6">
              <div className="rounded-3xl bg-white p-6 shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Audit Detail</p>
                    <h2 className="mt-2 text-2xl font-black text-blue-950">{detail ? detail.title : "Select An Audit"}</h2>
                  </div>
                  {detail && <button type="button" onClick={openEdit} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Edit</button>}
                </div>

                {detailLoading ? (
                  <p className="mt-6 text-sm font-semibold text-slate-500">Loading details...</p>
                ) : !detail ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm font-semibold text-slate-500">
                    Choose a record to manage visits, checklist items, attachments, and reminders.
                  </div>
                ) : (
                  <div className="mt-6 space-y-6">
                    <div className="rounded-3xl bg-slate-50 p-5">
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONES[detail.status]}`}>{STATUS_LABELS[detail.status]}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${PRIORITY_TONES[detail.priority]}`}>{detail.priority}</span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">{detail.mode}</span>
                      </div>
                      <div className="mt-4 grid gap-3 text-sm">
                        <DetailLine label="Client" value={detail.client.name} />
                        <DetailLine label="Program Audit" value={detail.programAudit?.name || "Custom audit"} />
                        <DetailLine label="Scheduled Start" value={formatDateTime(detail.scheduledStartAt)} />
                        <DetailLine label="Scheduled End" value={formatDateTime(detail.scheduledEndAt)} />
                        <DetailLine label="Owner" value={detail.ownerConsultant?.name || "Unassigned"} />
                        <DetailLine label="Follow-Up" value={formatDateTime(detail.followUpAt)} />
                        <DetailLine label="Location" value={detail.location || "-"} />
                        <DetailLine label="Description" value={detail.description || "-"} />
                        <DetailLine label="Internal Notes" value={detail.internalNotes || "-"} />
                        <DetailLine label="Outcome" value={detail.outcomeSummary || "-"} />
                      </div>
                      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                        <select value={statusDraft} onChange={(e) => setStatusDraft(e.target.value as AuditScheduleStatus)} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900">
                          {lookups.statuses.map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}
                        </select>
                        <button type="button" onClick={() => void saveStatus()} className="rounded-2xl bg-blue-900 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800">Save Status</button>
                        <button type="button" onClick={() => void removeSchedule()} className="rounded-2xl bg-red-500 px-4 py-3 text-sm font-bold text-white hover:bg-red-400">Delete</button>
                      </div>
                    </div>

                    <Section title="Visits" subtitle="Plan and update site visits">
                      <div className="grid gap-3">
                        <input value={visitForm.title} onChange={(e) => setVisitForm((p) => ({ ...p, title: e.target.value }))} placeholder="Visit title" className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" />
                        <textarea value={visitForm.purpose} onChange={(e) => setVisitForm((p) => ({ ...p, purpose: e.target.value }))} rows={2} placeholder="Purpose / agenda" className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" />
                        <div className="grid gap-3 md:grid-cols-2">
                          <input type="datetime-local" value={visitForm.plannedStartAt} onChange={(e) => setVisitForm((p) => ({ ...p, plannedStartAt: e.target.value }))} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" />
                          <input type="datetime-local" value={visitForm.plannedEndAt} onChange={(e) => setVisitForm((p) => ({ ...p, plannedEndAt: e.target.value }))} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" />
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <input value={visitForm.location} onChange={(e) => setVisitForm((p) => ({ ...p, location: e.target.value }))} placeholder="Location" className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" />
                          <input value={visitForm.contactPerson} onChange={(e) => setVisitForm((p) => ({ ...p, contactPerson: e.target.value }))} placeholder="Contact person" className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" />
                        </div>
                        <textarea value={visitForm.notes} onChange={(e) => setVisitForm((p) => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Notes" className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" />
                        {editingVisitId && (
                          <>
                            <textarea value={visitForm.outcome} onChange={(e) => setVisitForm((p) => ({ ...p, outcome: e.target.value }))} rows={2} placeholder="Outcome" className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" />
                            <select value={visitForm.status} onChange={(e) => setVisitForm((p) => ({ ...p, status: e.target.value as AuditVisitStatus }))} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900">
                              {Object.values(AuditVisitStatus).map((item) => <option key={item} value={item}>{VISIT_STATUS_LABELS[item]}</option>)}
                            </select>
                          </>
                        )}
                        <div className="flex flex-wrap gap-3">
                          <button type="button" onClick={() => void saveVisit()} disabled={savingVisit} className="rounded-2xl bg-[#f7c63d] px-4 py-3 text-sm font-bold text-slate-950 hover:bg-[#ffd457] disabled:opacity-50">{savingVisit ? "Saving..." : editingVisitId ? "Update Visit" : "Add Visit"}</button>
                          {editingVisitId && <button type="button" onClick={() => { setEditingVisitId(""); setVisitForm(EMPTY_VISIT_FORM); }} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel Edit</button>}
                        </div>
                      </div>
                      <div className="mt-5 space-y-3">
                        {detail.visits.length === 0 ? <EmptyState text="No visits planned yet." /> : detail.visits.map((visit) => (
                          <div key={visit.id} className="rounded-2xl bg-slate-50 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-bold text-blue-950">{visit.title}</p>
                                <p className="mt-1 text-sm text-slate-600">{formatDateTime(visit.plannedStartAt)}</p>
                              </div>
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">{VISIT_STATUS_LABELS[visit.status]}</span>
                            </div>
                            <div className="mt-3 grid gap-2 text-sm text-slate-600">
                              <DetailLine label="Purpose" value={visit.purpose || "-"} />
                              <DetailLine label="Location" value={visit.location || "-"} />
                              <DetailLine label="Contact" value={visit.contactPerson || "-"} />
                              <DetailLine label="Notes" value={visit.notes || "-"} />
                              <DetailLine label="Outcome" value={visit.outcome || "-"} />
                            </div>
                            <div className="mt-4 flex gap-2">
                              <button type="button" onClick={() => { setEditingVisitId(visit.id); setVisitForm({ title: visit.title, purpose: visit.purpose || "", plannedStartAt: toDateTimeLocalValue(visit.plannedStartAt), plannedEndAt: toDateTimeLocalValue(visit.plannedEndAt), location: visit.location || "", contactPerson: visit.contactPerson || "", notes: visit.notes || "", outcome: visit.outcome || "", status: visit.status }); }} className="rounded-2xl bg-blue-900 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800">Edit</button>
                              <button type="button" onClick={() => void removeVisit(visit.id)} className="rounded-2xl bg-red-500 px-3 py-2 text-xs font-bold text-white hover:bg-red-400">Delete</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>

                    <Section title="Checklist" subtitle="Track completion across all audit stages">
                      <div className="grid gap-3">
                        <input value={manualChecklist.label} onChange={(e) => setManualChecklist((p) => ({ ...p, label: e.target.value }))} placeholder="Manual checklist label" className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" />
                        <textarea value={manualChecklist.details} onChange={(e) => setManualChecklist((p) => ({ ...p, details: e.target.value }))} rows={2} placeholder="Details" className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" />
                        <button type="button" onClick={() => void addManualItem()} className="rounded-2xl bg-blue-900 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800">Add Manual Item</button>
                      </div>
                      <div className="mt-5 space-y-5">
                        {Object.values(AuditChecklistSource).map((source) => {
                          const items = groupedChecklist[source] || [];
                          if (items.length === 0) return null;
                          return (
                            <div key={source}>
                              <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">{CHECKLIST_LABELS[source]}</h4>
                              <div className="mt-3 space-y-3">
                                {items.map((item) => (
                                  <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                                    <div className="flex items-start gap-3">
                                      <input type="checkbox" checked={item.completed} onChange={(e) => void patchChecklist(item.id, { completed: e.target.checked })} className="mt-1" />
                                      <div className="flex-1">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                          <div><p className="font-bold text-slate-900">{item.label}</p><p className="mt-1 text-xs text-slate-500">{item.details || "No extra details"}</p></div>
                                          {item.source === AuditChecklistSource.MANUAL && <button type="button" onClick={() => void removeChecklist(item.id)} className="rounded-2xl bg-red-500 px-3 py-2 text-xs font-bold text-white hover:bg-red-400">Delete</button>}
                                        </div>
                                        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1.2fr_auto]">
                                          <select value={checklistDrafts[item.id]?.visitId || ""} onChange={(e) => setChecklistDrafts((p) => ({ ...p, [item.id]: { notes: p[item.id]?.notes || "", visitId: e.target.value } }))} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900">
                                            <option value="">No linked visit</option>
                                            {detail.visits.map((visit) => <option key={visit.id} value={visit.id}>{visit.title}</option>)}
                                          </select>
                                          <input value={checklistDrafts[item.id]?.notes || ""} onChange={(e) => setChecklistDrafts((p) => ({ ...p, [item.id]: { visitId: p[item.id]?.visitId || "", notes: e.target.value } }))} placeholder="Notes" className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" />
                                          <button type="button" onClick={() => void patchChecklist(item.id, { visitId: checklistDrafts[item.id]?.visitId || null, notes: checklistDrafts[item.id]?.notes || null })} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800">Save</button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Section>

                    <Section title="Attachments" subtitle="Audit-level and visit-level files">
                      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                        <select value={attachmentVisitId} onChange={(e) => setAttachmentVisitId(e.target.value)} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900">
                          <option value="">Audit-level attachment</option>
                          {detail.visits.map((visit) => <option key={visit.id} value={visit.id}>{visit.title}</option>)}
                        </select>
                        <input type="file" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" />
                        <button type="button" onClick={() => void uploadAttachment()} disabled={uploadingAttachment} className="rounded-2xl bg-[#f7c63d] px-4 py-3 text-sm font-bold text-slate-950 hover:bg-[#ffd457] disabled:opacity-50">{uploadingAttachment ? "Uploading..." : "Upload"}</button>
                      </div>
                      <div className="mt-5 space-y-3">
                        {detail.attachments.length === 0 ? <EmptyState text="No attachments uploaded yet." /> : detail.attachments.map((item) => (
                          <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div><p className="font-bold text-blue-950">{item.fileName}</p><p className="mt-1 text-xs text-slate-500">{item.visitId ? `Visit-linked file` : "Audit-level file"} • Uploaded {formatDateTime(item.createdAt)}</p></div>
                              <div className="flex gap-2">
                                <a href={item.fileUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-blue-900 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800">Open</a>
                                <button type="button" onClick={() => void removeAttachment(item.id)} className="rounded-2xl bg-red-500 px-3 py-2 text-xs font-bold text-white hover:bg-red-400">Delete</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>

                    <Section title="Reminders" subtitle="Generated notifications and email state">
                      <div className="space-y-3">
                        {detail.reminders.length === 0 ? <EmptyState text="No reminders generated yet." /> : detail.reminders.map((item) => (
                          <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div><p className="font-bold text-slate-900">{item.title}</p><p className="mt-1 text-sm text-slate-600">{item.message}</p></div>
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">{item.emailStatus}</span>
                            </div>
                            <p className="mt-3 text-xs text-slate-500">Notify at {formatDateTime(item.notifyAt)}</p>
                          </div>
                        ))}
                      </div>
                    </Section>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>

      {composerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30">
          <div className="h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{composerMode === "create" ? "Create Audit" : "Edit Audit"}</p>
                <h2 className="mt-2 text-2xl font-black text-blue-950">{composerMode === "create" ? "Schedule New Audit" : "Update Audit Schedule"}</h2>
              </div>
              <button type="button" onClick={() => setComposerOpen(false)} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Close</button>
            </div>

            <div className="mt-6 grid gap-4">
              <select value={scheduleForm.clientId} onChange={(e) => setScheduleForm((p) => ({ ...p, clientId: e.target.value }))} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900">
                <option value="">Select client</option>
                {lookups.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
              <select value={scheduleForm.programAuditId} onChange={(e) => setScheduleForm((p) => ({ ...p, programAuditId: e.target.value, title: !p.title && e.target.value ? lookups.programAudits.find((item) => item.id === e.target.value)?.name || p.title : p.title }))} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900">
                <option value="">Custom audit</option>
                {lookups.programAudits.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <input value={scheduleForm.title} onChange={(e) => setScheduleForm((p) => ({ ...p, title: e.target.value }))} placeholder="Audit title" className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900" />
              <textarea value={scheduleForm.description} onChange={(e) => setScheduleForm((p) => ({ ...p, description: e.target.value }))} rows={3} placeholder="Description / agenda" className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900" />
              <div className="grid gap-4 md:grid-cols-2">
                <input type="datetime-local" value={scheduleForm.scheduledStartAt} onChange={(e) => setScheduleForm((p) => ({ ...p, scheduledStartAt: e.target.value }))} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900" />
                <input type="datetime-local" value={scheduleForm.scheduledEndAt} onChange={(e) => setScheduleForm((p) => ({ ...p, scheduledEndAt: e.target.value }))} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900" />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <select value={scheduleForm.priority} onChange={(e) => setScheduleForm((p) => ({ ...p, priority: e.target.value as AuditPriority }))} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900">{lookups.priorities.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                <select value={scheduleForm.mode} onChange={(e) => setScheduleForm((p) => ({ ...p, mode: e.target.value as AuditMode }))} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900">{lookups.modes.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                <select value={scheduleForm.status} onChange={(e) => setScheduleForm((p) => ({ ...p, status: e.target.value as AuditScheduleStatus }))} disabled={composerMode === "create"} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 disabled:bg-slate-100">{lookups.statuses.map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}</select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input value={scheduleForm.location} onChange={(e) => setScheduleForm((p) => ({ ...p, location: e.target.value }))} placeholder="Location" className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900" />
                <select value={scheduleForm.ownerConsultantId} onChange={(e) => setScheduleForm((p) => ({ ...p, ownerConsultantId: e.target.value }))} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900">
                  <option value="">Unassigned</option>
                  {lookups.consultants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <input type="datetime-local" value={scheduleForm.followUpAt} onChange={(e) => setScheduleForm((p) => ({ ...p, followUpAt: e.target.value }))} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900" />
              <textarea value={scheduleForm.internalNotes} onChange={(e) => setScheduleForm((p) => ({ ...p, internalNotes: e.target.value }))} rows={3} placeholder="Internal notes" className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900" />
              {composerMode === "edit" && <textarea value={scheduleForm.outcomeSummary} onChange={(e) => setScheduleForm((p) => ({ ...p, outcomeSummary: e.target.value }))} rows={3} placeholder="Outcome summary" className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900" />}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => void saveSchedule()} disabled={savingSchedule} className="rounded-2xl bg-[#f7c63d] px-5 py-3 font-bold text-slate-950 hover:bg-[#ffd457] disabled:opacity-50">{savingSchedule ? "Saving..." : composerMode === "create" ? "Create Audit" : "Save Changes"}</button>
              <button type="button" onClick={() => setComposerOpen(false)} className="rounded-2xl border border-slate-300 px-5 py-3 font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "blue" | "amber" | "rose" | "emerald" }) {
  const toneClass = tone === "blue" ? "bg-blue-50 text-blue-950" : tone === "amber" ? "bg-amber-50 text-amber-950" : tone === "rose" ? "bg-rose-50 text-rose-950" : "bg-emerald-50 text-emerald-950";
  return <div className={`rounded-3xl p-6 shadow-md ${toneClass}`}><p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-80">{label}</p><p className="mt-3 text-3xl font-black">{value}</p></div>;
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1"><span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span><span className="text-sm leading-6 text-slate-700">{value}</span></div>;
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{title}</p><h3 className="mt-2 text-xl font-black text-blue-950">{subtitle}</h3><div className="mt-5">{children}</div></section>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">{text}</div>;
}
