export const ADMIN_PAGE_DEFINITIONS = [
  { key: "enquiries", label: "Enquiries", href: "/admin", group: "client", groupLabel: "Client" },
  { key: "client_onboarding", label: "Client Onboarding", href: "/admin/clients", group: "client", groupLabel: "Client" },
  { key: "module_control", label: "Module Control", href: "/admin/module-control", group: "core", groupLabel: "Core" },
  { key: "settings", label: "Settings", href: "/admin/settings", group: "core", groupLabel: "Core" },
  { key: "document_allotment", label: "Personal File Generator", href: "/admin/document-allotment", group: "hr", groupLabel: "HR" },
  { key: "compliance_legal_docs", label: "Legal Doc", href: "/admin/compliance/legal-docs", group: "compliance", groupLabel: "Compliance" },
  { key: "compliance_trainings", label: "Trainings", href: "/admin/compliance/trainings", group: "compliance", groupLabel: "Compliance" },
  { key: "compliance_committee_meetings", label: "Committee Meetings", href: "/admin/compliance/committee-meetings", group: "compliance", groupLabel: "Compliance" },
  { key: "holiday_master", label: "Holiday Master", href: "/admin/holiday-master", group: "ops", groupLabel: "Operations" },
  { key: "in_out_generator", label: "In-Out Generator", href: "/admin/in-out", group: "ops", groupLabel: "Operations" },
  { key: "program_audit", label: "Add Audit", href: "/admin/audit/program", group: "audit", groupLabel: "Audit Module" },
  { key: "client_audit_log", label: "Client Audit Log", href: "/admin/audit/client", group: "audit", groupLabel: "Audit Module" },
  { key: "training_calendar", label: "Training Calendar", href: "/admin/training-calendar", group: "audit", groupLabel: "Audit Module" },
  { key: "dc_connect", label: "DC Connect", href: "/admin/client-connect", group: "chat", groupLabel: "Communication" },
] as const;

export type AdminPageDefinition = (typeof ADMIN_PAGE_DEFINITIONS)[number];
export type AdminPageKey = AdminPageDefinition["key"];
export type AdminPageAccessMap = Record<AdminPageKey, boolean>;

export const ADMIN_PAGE_KEYS = ADMIN_PAGE_DEFINITIONS.map((page) => page.key);

export const DEFAULT_ADMIN_PAGE_ACCESS = Object.fromEntries(
  ADMIN_PAGE_DEFINITIONS.map((page) => [page.key, true])
) as AdminPageAccessMap;

export function findAdminPageKeyByPath(pathname: string): AdminPageKey | null {
  if (pathname === "/admin/audit") {
    return "program_audit";
  }

  const matched = ADMIN_PAGE_DEFINITIONS.find((page) => page.href === pathname);
  return matched?.key || null;
}

export function getFirstAccessibleAdminRoute(access: AdminPageAccessMap) {
  const firstEnabled = ADMIN_PAGE_DEFINITIONS.find((page) => access[page.key]);
  return firstEnabled?.href || "/signin";
}
