import { prisma } from "@/lib/prisma";

export const MODULE_KEYS = [
  "employees",
  "payroll",
  "in_out",
  "training",
  "committees",
  "documents",
  "audit",
  "chat",
  "notifications",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export type ModuleAccessMap = Record<ModuleKey, boolean>;

export const MODULE_LABELS: Record<ModuleKey, string> = {
  employees: "Employees",
  payroll: "Payroll",
  in_out: "In-Out",
  training: "Training",
  committees: "Committees",
  documents: "Documents",
  audit: "Audit",
  chat: "Chat",
  notifications: "Notifications",
};

export const DEFAULT_MODULE_ACCESS: ModuleAccessMap = {
  employees: true,
  payroll: true,
  in_out: true,
  training: true,
  committees: true,
  documents: true,
  audit: true,
  chat: true,
  notifications: true,
};

export function toModuleAccessMap(row: any | null | undefined): ModuleAccessMap {
  if (!row) return { ...DEFAULT_MODULE_ACCESS };
  return {
    employees: !!row.employeesEnabled,
    payroll: !!row.payrollEnabled,
    in_out: !!row.inOutEnabled,
    training: !!row.trainingEnabled,
    committees: !!row.committeesEnabled,
    documents: !!row.documentsEnabled,
    audit: !!row.auditEnabled,
    chat: !!row.chatEnabled,
    notifications: !!row.notificationsEnabled,
  };
}

export function toDbUpdatePayload(access: Partial<ModuleAccessMap>) {
  const payload: Record<string, boolean> = {};
  if (typeof access.employees === "boolean") payload.employeesEnabled = access.employees;
  if (typeof access.payroll === "boolean") payload.payrollEnabled = access.payroll;
  if (typeof access.in_out === "boolean") payload.inOutEnabled = access.in_out;
  if (typeof access.training === "boolean") payload.trainingEnabled = access.training;
  if (typeof access.committees === "boolean") payload.committeesEnabled = access.committees;
  if (typeof access.documents === "boolean") payload.documentsEnabled = access.documents;
  if (typeof access.audit === "boolean") payload.auditEnabled = access.audit;
  if (typeof access.chat === "boolean") payload.chatEnabled = access.chat;
  if (typeof access.notifications === "boolean") payload.notificationsEnabled = access.notifications;
  return payload;
}

export async function ensureClientModuleControl(clientId: string) {
  return prisma.moduleControl.upsert({
    where: { clientId },
    create: { clientId },
    update: {},
  });
}

export async function getClientModuleAccess(clientId: string): Promise<ModuleAccessMap> {
  const row = await ensureClientModuleControl(clientId);
  return toModuleAccessMap(row);
}

export async function isClientModuleEnabled(clientId: string, moduleKey: ModuleKey): Promise<boolean> {
  const access = await getClientModuleAccess(clientId);
  return !!access[moduleKey];
}
