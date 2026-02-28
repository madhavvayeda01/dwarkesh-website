import { prisma } from "@/lib/prisma";
import {
  ADMIN_PAGE_KEYS,
  DEFAULT_ADMIN_PAGE_ACCESS,
  type AdminPageAccessMap,
  type AdminPageKey,
} from "@/lib/admin-config";
import type { SessionPayload } from "@/lib/auth";

export function toStoredAdminPageAccessMap(value: unknown): AdminPageAccessMap {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const normalized = { ...DEFAULT_ADMIN_PAGE_ACCESS };

  for (const key of ADMIN_PAGE_KEYS) {
    if (typeof raw[key] === "boolean") {
      normalized[key] = raw[key];
    }
  }

  return normalized;
}

export function mergeAdminPageAccess(
  existing: AdminPageAccessMap,
  updates: Partial<AdminPageAccessMap>
): AdminPageAccessMap {
  const merged = { ...existing };

  for (const key of ADMIN_PAGE_KEYS) {
    if (typeof updates[key] === "boolean") {
      merged[key] = updates[key] as boolean;
    }
  }

  return merged;
}

export async function getStoredConsultantAdminPageAccess(
  consultantId: string
): Promise<AdminPageAccessMap> {
  const consultant = await prisma.consultant.findUnique({
    where: { id: consultantId },
    select: { pageAccess: true },
  });

  return toStoredAdminPageAccessMap(consultant?.pageAccess);
}

export async function getAdminPageAccessForSession(
  session: SessionPayload | null | undefined
): Promise<AdminPageAccessMap> {
  if (!session || session.role !== "admin") {
    return { ...DEFAULT_ADMIN_PAGE_ACCESS };
  }

  if (session.adminType !== "consultant" || !session.adminId) {
    return { ...DEFAULT_ADMIN_PAGE_ACCESS };
  }

  return getStoredConsultantAdminPageAccess(session.adminId);
}

export async function isAdminPageEnabledForSession(
  session: SessionPayload | null | undefined,
  pageKey: AdminPageKey
): Promise<boolean> {
  const access = await getAdminPageAccessForSession(session);
  return !!access[pageKey];
}
