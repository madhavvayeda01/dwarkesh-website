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

export const CLIENT_PAGE_DEFINITIONS = [
  {
    key: "employee_master",
    label: "Employee Master",
    href: "/client/employees",
    module: "employees",
    navGroup: "employee_data",
    sectionLabel: "Employee Data",
  },
  {
    key: "add_employee",
    label: "Add New Employee",
    href: "/client/employees/new",
    module: "employees",
    navGroup: "employee_data",
    sectionLabel: "Employee Data",
  },
  {
    key: "personal_documents",
    label: "Personal File Documents",
    href: "/client/documents",
    module: "employees",
    navGroup: "employee_data",
    sectionLabel: "Employee Data",
  },
  {
    key: "payroll",
    label: "Payroll",
    href: "/client/payroll",
    module: "payroll",
    navGroup: "salary",
    subGroup: "payroll",
    sectionLabel: "Salary",
  },
  {
    key: "payroll_data",
    label: "Payroll Data",
    href: "/client/payroll-data",
    module: "payroll",
    navGroup: "salary",
    subGroup: "payroll",
    sectionLabel: "Salary",
  },
  {
    key: "payslip",
    label: "Payslip",
    href: "/client/payslip",
    module: "payroll",
    navGroup: "salary",
    subGroup: "payroll",
    sectionLabel: "Salary",
  },
  {
    key: "payslip_data",
    label: "Payslip Data",
    href: "/client/payslip-data",
    module: "payroll",
    navGroup: "salary",
    subGroup: "payroll",
    sectionLabel: "Salary",
  },
  {
    key: "advance",
    label: "Advance",
    href: "/client/advance",
    module: "payroll",
    navGroup: "salary",
    subGroup: "advance",
    sectionLabel: "Salary",
  },
  {
    key: "advance_data",
    label: "Advance Data",
    href: "/client/advance-data",
    module: "payroll",
    navGroup: "salary",
    subGroup: "advance",
    sectionLabel: "Salary",
  },
  {
    key: "pf_challan",
    label: "PF Challan",
    href: "/client/pf-challan",
    module: "payroll",
    navGroup: "salary",
    subGroup: "compliance",
    sectionLabel: "Salary",
  },
  {
    key: "esic_challan",
    label: "ESIC Challan",
    href: "/client/esic-challan",
    module: "payroll",
    navGroup: "salary",
    subGroup: "compliance",
    sectionLabel: "Salary",
  },
  {
    key: "in_out",
    label: "IN-OUT",
    href: "/client/in-out",
    module: "in_out",
    navGroup: "salary",
    subGroup: "attendance",
    sectionLabel: "Salary",
  },
  {
    key: "in_out_data",
    label: "IN-OUT Data",
    href: "/client/in-out-data",
    module: "in_out",
    navGroup: "salary",
    subGroup: "attendance",
    sectionLabel: "Salary",
  },
  {
    key: "audit_dashboard",
    label: "Audit Dashboard",
    href: "/client/audit",
    module: "audit",
    navGroup: "audit_module",
    sectionLabel: "Audit Module",
  },
  {
    key: "training",
    label: "Training",
    href: "/client/training",
    module: "training",
    navGroup: "audit_module",
    sectionLabel: "Audit Module",
  },
  {
    key: "committees",
    label: "Committees",
    href: "/client/committees",
    module: "committees",
    navGroup: "audit_module",
    sectionLabel: "Audit Module",
  },
  {
    key: "dc_connect",
    label: "DC Connect",
    href: "/client/chat",
    module: "chat",
    navGroup: "chat",
    sectionLabel: "Communication",
  },
] as const;

export type ClientPageDefinition = (typeof CLIENT_PAGE_DEFINITIONS)[number];
export type ClientPageKey = ClientPageDefinition["key"];
export type PageAccessMap = Record<ClientPageKey, boolean>;

export const CLIENT_PAGE_KEYS = CLIENT_PAGE_DEFINITIONS.map((page) => page.key);

export const DEFAULT_PAGE_ACCESS = Object.fromEntries(
  CLIENT_PAGE_DEFINITIONS.map((page) => [page.key, true])
) as PageAccessMap;

export const CLIENT_PAGE_LABELS = Object.fromEntries(
  CLIENT_PAGE_DEFINITIONS.map((page) => [page.key, page.label])
) as Record<ClientPageKey, string>;

export const CLIENT_PAGE_BY_KEY = Object.fromEntries(
  CLIENT_PAGE_DEFINITIONS.map((page) => [page.key, page])
) as Record<ClientPageKey, ClientPageDefinition>;

export function getFirstAccessibleClientRoute(pages: PageAccessMap) {
  const firstEnabled = CLIENT_PAGE_DEFINITIONS.find((page) => pages[page.key]);
  return firstEnabled?.href || "/client-dashboard";
}
