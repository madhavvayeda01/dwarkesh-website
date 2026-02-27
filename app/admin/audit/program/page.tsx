"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";

type OptionItem = {
  id: string;
  name: string;
};

type ProgramAudit = {
  id: string;
  name: string;
  parameterOptionIds: string[];
  documentOptionIds: string[];
  floorOptionIds: string[];
  createdAt: string;
  updatedAt: string;
};

const OPTION_TYPES = {
  parameter: "parameter",
  document: "document",
  floor: "floor",
} as const;

type OptionType = keyof typeof OPTION_TYPES;

async function readJsonSafe(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function ProgramAuditPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const [parameterOptions, setParameterOptions] = useState<OptionItem[]>([]);
  const [documentOptions, setDocumentOptions] = useState<OptionItem[]>([]);
  const [floorOptions, setFloorOptions] = useState<OptionItem[]>([]);
  const [audits, setAudits] = useState<ProgramAudit[]>([]);

  const [auditName, setAuditName] = useState("");
  const [selectedParameters, setSelectedParameters] = useState<string[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [selectedFloors, setSelectedFloors] = useState<string[]>([]);
  const [editingAuditId, setEditingAuditId] = useState<string | null>(null);

  const [newParameter, setNewParameter] = useState("");
  const [newDocument, setNewDocument] = useState("");
  const [newDocumentParameterId, setNewDocumentParameterId] = useState("");
  const [newFloor, setNewFloor] = useState("");
  const [activeView, setActiveView] = useState<"add" | "list">("add");
  const [selectedParameterByAudit, setSelectedParameterByAudit] = useState<Record<string, string>>({});

  const editingAudit = useMemo(
    () => audits.find((item) => item.id === editingAuditId) || null,
    [audits, editingAuditId]
  );

  useEffect(() => {
    async function init() {
      try {
        const me = await fetch("/api/admin/me", { cache: "no-store" });
        const meData = await readJsonSafe(me);
        const loggedIn = meData?.data?.loggedIn ?? meData?.loggedIn ?? false;
        if (!loggedIn) {
          window.location.href = "/signin";
          return;
        }

        await loadAll();
      } catch {
        setStatus("Failed to load program audit page.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  useEffect(() => {
    setSelectedParameterByAudit((prev) => {
      const next = { ...prev };
      for (const audit of audits) {
        if (!next[audit.id] && audit.parameterOptionIds.length > 0) {
          next[audit.id] = audit.parameterOptionIds[0];
        }
      }
      return next;
    });
  }, [audits]);

  async function loadAll() {
    try {
      const [parametersRes, documentsRes, floorsRes, auditsRes] = await Promise.all([
        fetch("/api/admin/audit-options?type=parameter", { cache: "no-store" }),
        fetch("/api/admin/audit-options?type=document", { cache: "no-store" }),
        fetch("/api/admin/audit-options?type=floor", { cache: "no-store" }),
        fetch("/api/admin/program-audits", { cache: "no-store" }),
      ]);

      const [parametersData, documentsData, floorsData, auditsData] = await Promise.all([
        readJsonSafe(parametersRes),
        readJsonSafe(documentsRes),
        readJsonSafe(floorsRes),
        readJsonSafe(auditsRes),
      ]);

      if (!parametersRes.ok || !documentsRes.ok || !floorsRes.ok || !auditsRes.ok) {
        const message =
          parametersData?.message ||
          documentsData?.message ||
          floorsData?.message ||
          auditsData?.message ||
          "Failed to load program audit data.";
        setStatus(message);
        setParameterOptions([]);
        setDocumentOptions([]);
        setFloorOptions([]);
        setAudits([]);
        return;
      }

      setParameterOptions(parametersData?.data?.options || []);
      setDocumentOptions(documentsData?.data?.options || []);
      setFloorOptions(floorsData?.data?.options || []);
      setAudits(auditsData?.data?.audits || []);
    } catch {
      setStatus("Failed to load program audit data.");
      setParameterOptions([]);
      setDocumentOptions([]);
      setFloorOptions([]);
      setAudits([]);
    }
  }

  function resetForm() {
    setAuditName("");
    setSelectedParameters([]);
    setSelectedDocuments([]);
    setSelectedFloors([]);
    setNewDocumentParameterId("");
    setEditingAuditId(null);
  }

  function toggleSelection(
    id: string,
    selected: string[],
    setSelected: (value: string[]) => void
  ) {
    if (selected.includes(id)) {
      setSelected(selected.filter((value) => value !== id));
      return;
    }
    setSelected([...selected, id]);
  }

  async function addOption(type: OptionType, name: string) {
    if (!name.trim()) return;

    const res = await fetch("/api/admin/audit-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, name: name.trim() }),
    });
    const data = await readJsonSafe(res);
    if (!res.ok) {
      setStatus(data?.message || "Failed to add option.");
      return;
    }

    setStatus("Option added.");
    await loadAll();
  }

  async function editOption(type: OptionType, option: OptionItem) {
    const nextName = window.prompt("Update option name:", option.name);
    if (!nextName || !nextName.trim()) return;

    const res = await fetch(`/api/admin/audit-options/${option.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, name: nextName.trim() }),
    });
    const data = await readJsonSafe(res);
    if (!res.ok) {
      setStatus(data?.message || "Failed to update option.");
      return;
    }

    setStatus("Option updated.");
    await loadAll();
  }

  async function deleteOption(type: OptionType, option: OptionItem) {
    const confirmed = window.confirm(`Delete "${option.name}"?`);
    if (!confirmed) return;

    const res = await fetch(
      `/api/admin/audit-options/${option.id}?type=${type}`,
      { method: "DELETE" }
    );
    const data = await readJsonSafe(res);
    if (!res.ok) {
      setStatus(data?.message || "Failed to delete option.");
      return;
    }

    setStatus("Option deleted.");
    await loadAll();
  }

  async function saveAudit() {
    if (!auditName.trim()) {
      setStatus("Please enter audit name.");
      return;
    }

    const payload = {
      name: auditName.trim(),
      parameterOptionIds: selectedParameters,
      documentOptionIds: selectedDocuments,
      floorOptionIds: selectedFloors,
    };

    const isEdit = !!editingAuditId;
    const url = isEdit ? `/api/admin/program-audits/${editingAuditId}` : "/api/admin/program-audits";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJsonSafe(res);
    if (!res.ok) {
      setStatus(data?.message || "Failed to save audit.");
      return;
    }

    setStatus(isEdit ? "Audit updated." : "Audit added.");
    resetForm();
    await loadAll();
  }

  async function deleteAudit(id: string) {
    const confirmed = window.confirm("Delete this audit?");
    if (!confirmed) return;

    const res = await fetch(`/api/admin/program-audits/${id}`, { method: "DELETE" });
    const data = await readJsonSafe(res);
    if (!res.ok) {
      setStatus(data?.message || "Failed to delete audit.");
      return;
    }

    if (editingAuditId === id) {
      resetForm();
    }
    setStatus("Audit deleted.");
    await loadAll();
  }

  function startEditAudit(audit: ProgramAudit) {
    setEditingAuditId(audit.id);
    setAuditName(audit.name);
    setSelectedParameters(audit.parameterOptionIds || []);
    setSelectedDocuments(audit.documentOptionIds || []);
    setSelectedFloors(audit.floorOptionIds || []);
    setNewDocumentParameterId("");
    setStatus("Editing selected audit.");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar />
        <main className="flex-1 p-8 text-slate-900">Loading...</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1 p-8 text-slate-900">
        <h1 className="text-3xl font-extrabold text-blue-950">Program Audit</h1>
        <p className="mt-2 text-slate-600">
          Create and manage audit masters with reusable parameters and requirement lists.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setActiveView("add")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              activeView === "add"
                ? "bg-blue-900 text-white"
                : "bg-white text-blue-900"
            }`}
          >
            Add Audit
          </button>
          <button
            onClick={() => setActiveView("list")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              activeView === "list"
                ? "bg-blue-900 text-white"
                : "bg-white text-blue-900"
            }`}
          >
            Existing Program Audits
          </button>
        </div>

        {activeView === "add" && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-blue-950">
                {editingAudit ? "Edit Audit" : "Add Audit"}
              </h2>
              {editingAudit && (
                <button
                  onClick={resetForm}
                  className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold">Audit Name</label>
              <input
                value={auditName}
                onChange={(e) => setAuditName(e.target.value)}
                className="mt-1 w-full rounded-xl border bg-white px-4 py-3 text-slate-900"
                placeholder="Enter audit name"
              />
            </div>

            <OptionSection
              title="Step 1: Parameters Involved"
              type="parameter"
              options={parameterOptions}
              selectedIds={selectedParameters}
              onToggle={(id) => toggleSelection(id, selectedParameters, setSelectedParameters)}
              newValue={newParameter}
              onNewValueChange={setNewParameter}
              onAdd={async () => {
                await addOption("parameter", newParameter);
                setNewParameter("");
              }}
              onEdit={(option) => editOption("parameter", option)}
              onDelete={(option) => deleteOption("parameter", option)}
            />

            <OptionSection
              title="Step 2: Documents Required"
              type="document"
              options={documentOptions}
              selectedIds={selectedDocuments}
              onToggle={(id) => toggleSelection(id, selectedDocuments, setSelectedDocuments)}
              newValue={newDocument}
              onNewValueChange={setNewDocument}
              selectionLabel="Select Parameter"
              selectionValue={newDocumentParameterId}
              selectionOptions={parameterOptions
                .filter((item) => selectedParameters.includes(item.id))
                .map((item) => ({ id: item.id, name: item.name }))}
              onSelectionChange={setNewDocumentParameterId}
              onAdd={async () => {
                if (selectedParameters.length === 0) {
                  setStatus("Select at least one parameter in Step 1 before adding documents.");
                  return;
                }
                if (!newDocumentParameterId) {
                  setStatus("Select one parameter in Step 2 before adding document name.");
                  return;
                }
                await addOption("document", newDocument);
                setNewDocument("");
              }}
              onEdit={(option) => editOption("document", option)}
              onDelete={(option) => deleteOption("document", option)}
            />

            <OptionSection
              title="Step 3: On Floor Requirements"
              type="floor"
              options={floorOptions}
              selectedIds={selectedFloors}
              onToggle={(id) => toggleSelection(id, selectedFloors, setSelectedFloors)}
              newValue={newFloor}
              onNewValueChange={setNewFloor}
              onAdd={async () => {
                await addOption("floor", newFloor);
                setNewFloor("");
              }}
              onEdit={(option) => editOption("floor", option)}
              onDelete={(option) => deleteOption("floor", option)}
            />

            <div className="mt-6">
              <button
                onClick={saveAudit}
                className="rounded-2xl bg-yellow-500 px-6 py-3 font-semibold text-blue-950 hover:bg-yellow-400"
              >
                {editingAudit ? "Update Audit" : "Add Audit"}
              </button>
            </div>
          </div>
        )}

        {activeView === "list" && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-blue-950">Existing Program Audits</h2>

            {editingAudit && (
              <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-bold text-blue-950">
                    Editing: {editingAudit.name}
                  </h3>
                  <button
                    onClick={resetForm}
                    className="rounded-xl bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-800"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Audit Name</label>
                  <input
                    value={auditName}
                    onChange={(e) => setAuditName(e.target.value)}
                    className="mt-1 w-full rounded-xl border bg-white px-4 py-2 text-slate-900"
                  />
                </div>

                <SimpleSelectList
                  title="Parameters"
                  options={parameterOptions}
                  selectedIds={selectedParameters}
                  onToggle={(id) => toggleSelection(id, selectedParameters, setSelectedParameters)}
                />

                <SimpleSelectList
                  title="Documents"
                  options={documentOptions}
                  selectedIds={selectedDocuments}
                  onToggle={(id) => toggleSelection(id, selectedDocuments, setSelectedDocuments)}
                />

                <SimpleSelectList
                  title="On Floor Requirements"
                  options={floorOptions}
                  selectedIds={selectedFloors}
                  onToggle={(id) => toggleSelection(id, selectedFloors, setSelectedFloors)}
                />

                <div className="mt-4">
                  <button
                    onClick={saveAudit}
                    className="rounded-xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {audits.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">No audits added yet.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {audits.map((audit) => {
                  const docsByParam = buildItemsByParameter(
                    audit.parameterOptionIds,
                    audit.documentOptionIds,
                    parameterOptions,
                    documentOptions
                  );
                  const floorByParam = buildItemsByParameter(
                    audit.parameterOptionIds,
                    audit.floorOptionIds,
                    parameterOptions,
                    floorOptions
                  );

                  const activeParameterId =
                    selectedParameterByAudit[audit.id] || audit.parameterOptionIds[0] || "";
                  const activeParameterName =
                    parameterOptions.find((item) => item.id === activeParameterId)?.name || "";
                  const activeDocs = activeParameterName ? docsByParam.get(activeParameterName) || [] : [];
                  const activeFloors = activeParameterName
                    ? floorByParam.get(activeParameterName) || []
                    : [];

                  return (
                    <div key={audit.id} className="rounded-xl border bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-bold text-blue-950">{audit.name}</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditAudit(audit)}
                            className="rounded-xl bg-blue-900 px-3 py-2 text-xs font-semibold text-white"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteAudit(audit.id)}
                            className="rounded-xl bg-red-500 px-3 py-2 text-xs font-semibold text-white"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="mb-2 text-sm font-semibold text-slate-700">Parameters</p>
                        <div className="flex flex-wrap gap-2">
                          {audit.parameterOptionIds.length === 0 ? (
                            <span className="text-sm text-slate-500">No parameters selected.</span>
                          ) : (
                            audit.parameterOptionIds.map((paramId) => {
                              const paramName =
                                parameterOptions.find((item) => item.id === paramId)?.name || "";
                              if (!paramName) return null;
                              const active = activeParameterId === paramId;
                              return (
                                <button
                                  key={paramId}
                                  onClick={() =>
                                    setSelectedParameterByAudit((prev) => ({
                                      ...prev,
                                      [audit.id]: paramId,
                                    }))
                                  }
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    active
                                      ? "bg-blue-900 text-white"
                                      : "bg-blue-100 text-blue-900"
                                  }`}
                                >
                                  {paramName}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="mb-2 text-sm font-semibold text-slate-700">Documents</p>
                        <div className="rounded-lg border bg-slate-50 p-3">
                          {activeDocs.length === 0 ? (
                            <span className="text-sm text-slate-500">No documents for selected parameter.</span>
                          ) : (
                            <ol className="ml-5 list-decimal space-y-1 text-sm text-slate-900">
                              {activeDocs.map((item, idx) => (
                                <li key={`${audit.id}-doc-${idx}`}>{item}</li>
                              ))}
                            </ol>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="mb-2 text-sm font-semibold text-slate-700">On Floor Requirements</p>
                        <div className="rounded-lg border bg-slate-50 p-3">
                          {activeFloors.length === 0 ? (
                            <span className="text-sm text-slate-500">
                              No on-floor requirements for selected parameter.
                            </span>
                          ) : (
                            <ol className="ml-5 list-decimal space-y-1 text-sm text-slate-900">
                              {activeFloors.map((item, idx) => (
                                <li key={`${audit.id}-floor-${idx}`}>{item}</li>
                              ))}
                            </ol>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {status && <p className="mt-4 text-sm font-semibold text-slate-700">{status}</p>}
      </main>
    </div>
  );
}

function renderSelectedNames(selectedIds: string[], options: OptionItem[]) {
  const byId = new Map(options.map((item) => [item.id, item.name]));
  const names = selectedIds.map((id) => byId.get(id)).filter(Boolean);
  if (!names.length) return "-";
  return names.join(", ");
}

function splitDocumentEntries(rawNames: string[]): string[] {
  const items = rawNames
    .flatMap((raw) => raw.split(/\r?\n|,/g))
    .map((item) => item.trim())
    .filter(Boolean);

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

function buildItemsByParameter(
  parameterIds: string[],
  itemIds: string[],
  parameterOptions: OptionItem[],
  sourceOptions: OptionItem[]
) {
  const parameterById = new Map(parameterOptions.map((item) => [item.id, item.name]));
  const sourceById = new Map(sourceOptions.map((item) => [item.id, item.name]));

  const selectedParameters = parameterIds
    .map((id) => ({ id, name: parameterById.get(id) || "" }))
    .filter((item) => item.name);
  const rawItems = itemIds.map((id) => sourceById.get(id) || "").filter(Boolean);
  const items = splitDocumentEntries(rawItems);

  const grouped = new Map<string, string[]>();
  selectedParameters.forEach((parameter) => grouped.set(parameter.name, []));
  if (!grouped.size) grouped.set("General", []);

  for (const value of items) {
    const lowered = value.toLowerCase();
    let matchedParameter = "";

    for (const parameter of selectedParameters) {
      const p = parameter.name.toLowerCase();
      const exactPrefix = new RegExp(`^\\[?${p}\\]?\\s*[:-]`, "i");
      if (exactPrefix.test(value) || lowered.includes(p)) {
        matchedParameter = parameter.name;
        break;
      }
    }

    if (!matchedParameter) {
      matchedParameter = selectedParameters[0]?.name || "General";
    }

    const list = grouped.get(matchedParameter) || [];
    list.push(value);
    grouped.set(matchedParameter, list);
  }
  return grouped;
}

function SimpleSelectList({
  title,
  options,
  selectedIds,
  onToggle,
}: {
  title: string;
  options: OptionItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-sm font-semibold text-slate-700">{title}</p>
      <div className="max-h-36 overflow-y-auto rounded-xl border bg-white">
        {options.length === 0 ? (
          <p className="p-3 text-sm text-slate-500">No options available.</p>
        ) : (
          options.map((option, index) => (
            <label
              key={option.id}
              className="grid grid-cols-[40px_1fr] items-center gap-2 border-b px-3 py-2 text-sm last:border-b-0"
            >
              <span className="font-semibold text-slate-600">{index + 1}.</span>
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(option.id)}
                  onChange={() => onToggle(option.id)}
                />
                <span>{option.name}</span>
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

function OptionSection({
  title,
  options,
  selectedIds,
  onToggle,
  newValue,
  onNewValueChange,
  onAdd,
  onEdit,
  onDelete,
  selectionLabel,
  selectionValue,
  selectionOptions,
  onSelectionChange,
}: {
  title: string;
  type: OptionType;
  options: OptionItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  newValue: string;
  onNewValueChange: (value: string) => void;
  onAdd: () => void;
  onEdit: (option: OptionItem) => void;
  onDelete: (option: OptionItem) => void;
  selectionLabel?: string;
  selectionValue?: string;
  selectionOptions?: Array<{ id: string; name: string }>;
  onSelectionChange?: (value: string) => void;
}) {
  return (
    <div className="mt-6 rounded-xl border p-4">
      <h3 className="text-base font-bold text-blue-950">{title}</h3>

      <div className="mt-3 overflow-hidden rounded-xl border">
        {options.length === 0 ? (
          <p className="p-3 text-sm text-slate-600">No items added yet.</p>
        ) : (
          <div className="max-h-48 overflow-y-auto">
            {options.map((option, index) => {
              const selected = selectedIds.includes(option.id);
              return (
                <div
                  key={option.id}
                  className="grid grid-cols-[56px_1fr_auto] items-center gap-3 border-b px-3 py-2 last:border-b-0"
                >
                  <span className="text-sm font-semibold text-slate-700">{index + 1}.</span>
                  <label className="flex items-center gap-2 text-sm text-slate-900">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggle(option.id)}
                    />
                    <span>{option.name}</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onEdit(option)}
                      className="text-xs font-semibold text-blue-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(option)}
                      className="text-xs font-semibold text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectionLabel && selectionOptions && onSelectionChange && (
        <div className="mt-3">
          <label className="mb-1 block text-sm font-semibold text-slate-700">{selectionLabel}</label>
          <select
            value={selectionValue || ""}
            onChange={(e) => onSelectionChange(e.target.value)}
            className="w-full rounded-xl border bg-white px-4 py-2 text-slate-900"
          >
            <option value="">-- Select --</option>
            {selectionOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          value={newValue}
          onChange={(e) => onNewValueChange(e.target.value)}
          placeholder="Add new item"
          className="w-full rounded-xl border bg-white px-4 py-2 text-slate-900"
        />
        <button
          onClick={onAdd}
          className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Add
        </button>
      </div>
    </div>
  );
}


