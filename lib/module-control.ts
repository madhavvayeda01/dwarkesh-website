import { prisma } from "@/lib/prisma";
import {
  CLIENT_PAGE_BY_KEY,
  CLIENT_PAGE_KEYS,
  DEFAULT_MODULE_ACCESS,
  DEFAULT_PAGE_ACCESS,
  type ClientPageKey,
  type ModuleAccessMap,
  type ModuleKey,
  type PageAccessMap,
} from "@/lib/module-config";

type ModuleControlRow = {
  employeesEnabled: boolean;
  payrollEnabled: boolean;
  inOutEnabled: boolean;
  trainingEnabled: boolean;
  committeesEnabled: boolean;
  documentsEnabled: boolean;
  auditEnabled: boolean;
  chatEnabled: boolean;
  notificationsEnabled: boolean;
  pageAccess?: unknown;
} | null | undefined;

export { MODULE_KEYS, MODULE_LABELS, DEFAULT_MODULE_ACCESS, CLIENT_PAGE_DEFINITIONS } from "@/lib/module-config";
export type { ModuleKey, ModuleAccessMap, ClientPageKey, PageAccessMap } from "@/lib/module-config";

export function toModuleAccessMap(row: ModuleControlRow): ModuleAccessMap {
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

export function toStoredPageAccessMap(value: unknown): PageAccessMap {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const normalized = { ...DEFAULT_PAGE_ACCESS };

  for (const key of CLIENT_PAGE_KEYS) {
    if (typeof raw[key] === "boolean") {
      normalized[key] = raw[key] as boolean;
    }
  }

  return normalized;
}

export function toEffectivePageAccessMap(
  pageAccess: PageAccessMap,
  moduleAccess: ModuleAccessMap
): PageAccessMap {
  const effective = { ...pageAccess };

  for (const key of CLIENT_PAGE_KEYS) {
    const page = CLIENT_PAGE_BY_KEY[key];
    effective[key] = pageAccess[key] && moduleAccess[page.module];
  }

  return effective;
}

export function getImpersonationPageAccess(moduleAccess: ModuleAccessMap): PageAccessMap {
  return toEffectivePageAccessMap({ ...DEFAULT_PAGE_ACCESS }, moduleAccess);
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

export function mergePageAccess(
  existing: PageAccessMap,
  updates: Partial<PageAccessMap>
): PageAccessMap {
  const merged = { ...existing };

  for (const key of CLIENT_PAGE_KEYS) {
    if (typeof updates[key] === "boolean") {
      merged[key] = updates[key] as boolean;
    }
  }

  return merged;
}

export async function ensureClientModuleControl(clientId: string) {
  return prisma.moduleControl.upsert({
    where: { clientId },
    create: {
      clientId,
      pageAccess: DEFAULT_PAGE_ACCESS,
    },
    update: {},
  });
}

export async function getClientModuleAccess(clientId: string): Promise<ModuleAccessMap> {
  const row = await prisma.moduleControl.findUnique({
    where: { clientId },
  });
  return toModuleAccessMap(row);
}

export async function getStoredClientPageAccess(clientId: string): Promise<PageAccessMap> {
  const row = await prisma.moduleControl.findUnique({
    where: { clientId },
    select: { pageAccess: true },
  });
  return toStoredPageAccessMap(row?.pageAccess);
}

export async function getClientPageAccess(clientId: string): Promise<PageAccessMap> {
  const row = await prisma.moduleControl.findUnique({
    where: { clientId },
    select: {
      employeesEnabled: true,
      payrollEnabled: true,
      inOutEnabled: true,
      trainingEnabled: true,
      committeesEnabled: true,
      documentsEnabled: true,
      auditEnabled: true,
      chatEnabled: true,
      notificationsEnabled: true,
      pageAccess: true,
    },
  });

  const modules = toModuleAccessMap(row);
  const pages = toStoredPageAccessMap(row?.pageAccess);
  return toEffectivePageAccessMap(pages, modules);
}

export async function isClientModuleEnabled(clientId: string, moduleKey: ModuleKey): Promise<boolean> {
  const access = await getClientModuleAccess(clientId);
  return !!access[moduleKey];
}

export async function isClientPageEnabled(clientId: string, pageKey: ClientPageKey): Promise<boolean> {
  const pages = await getClientPageAccess(clientId);
  return !!pages[pageKey];
}
