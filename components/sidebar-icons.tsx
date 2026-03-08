import type { AdminPageKey } from "@/lib/admin-config";
import type { ClientPageKey } from "@/lib/module-config";

export type SidebarIconName =
  | "home"
  | "inbox"
  | "building"
  | "layout"
  | "sliders"
  | "folder"
  | "shield"
  | "sparkles"
  | "users"
  | "calendar"
  | "clock"
  | "clipboard"
  | "message"
  | "wallet"
  | "receipt"
  | "userPlus"
  | "files"
  | "coins"
  | "sun"
  | "moon"
  | "briefcase"
  | "compass"
  | "chevronLeft"
  | "chevronRight";

type SidebarIconProps = {
  name: SidebarIconName;
  className?: string;
};

export function SidebarIcon({ name, className }: SidebarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {renderIcon(name)}
    </svg>
  );
}

function renderIcon(name: SidebarIconName) {
  switch (name) {
    case "home":
      return (
        <>
          <path d="M4 10.5 12 4l8 6.5" />
          <path d="M6.5 9.5V20h11V9.5" />
          <path d="M10 20v-5h4v5" />
        </>
      );
    case "inbox":
      return (
        <>
          <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5v7a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 15.5z" />
          <path d="M4 13h4l2 3h4l2-3h4" />
        </>
      );
    case "building":
      return (
        <>
          <path d="M6 20V7.5L12 4l6 3.5V20" />
          <path d="M9.5 20v-4.5h5V20" />
          <path d="M9 9h.01M15 9h.01M9 12h.01M15 12h.01" />
        </>
      );
    case "layout":
      return (
        <>
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" />
        </>
      );
    case "sliders":
      return (
        <>
          <path d="M5 6h14" />
          <path d="M5 12h14" />
          <path d="M5 18h14" />
          <circle cx="9" cy="6" r="1.8" />
          <circle cx="15" cy="12" r="1.8" />
          <circle cx="11" cy="18" r="1.8" />
        </>
      );
    case "folder":
      return (
        <>
          <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H10l2 2h5.5A2.5 2.5 0 0 1 20 10.5v6A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
        </>
      );
    case "shield":
      return (
        <>
          <path d="M12 4 18 6.5v5.5c0 3.8-2.4 6.5-6 8-3.6-1.5-6-4.2-6-8V6.5z" />
          <path d="m9.5 12.2 1.8 1.8 3.2-3.6" />
        </>
      );
    case "sparkles":
      return (
        <>
          <path d="m12 4 1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" />
          <path d="m19 4 .7 1.8L21.5 6.5l-1.8.7L19 9l-.7-1.8-1.8-.7 1.8-.7z" />
          <path d="m5 15 .9 2.2L8 18l-2.1.8L5 21l-.9-2.2L2 18l2.1-.8z" />
        </>
      );
    case "users":
      return (
        <>
          <circle cx="9" cy="8.5" r="3" />
          <path d="M4.5 19v-.7A4.8 4.8 0 0 1 9.3 13.5h1.4a4.8 4.8 0 0 1 4.8 4.8v.7" />
          <path d="M17 14a3.6 3.6 0 0 1 2.5 3.4v1.6" />
          <path d="M15.8 5.5a2.8 2.8 0 0 1 0 5.4" />
        </>
      );
    case "calendar":
      return (
        <>
          <rect x="4" y="6" width="16" height="14" rx="2.5" />
          <path d="M8 4v4M16 4v4M4 10h16" />
        </>
      );
    case "clock":
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4.5l3 2" />
        </>
      );
    case "clipboard":
      return (
        <>
          <rect x="6" y="5.5" width="12" height="15" rx="2.5" />
          <path d="M9 5.5h6A1.5 1.5 0 0 0 13.5 4h-3A1.5 1.5 0 0 0 9 5.5Z" />
          <path d="M9 11h6M9 15h4" />
        </>
      );
    case "message":
      return (
        <>
          <path d="M5.5 6h13A1.5 1.5 0 0 1 20 7.5v7A1.5 1.5 0 0 1 18.5 16H11l-4.5 3v-3H5.5A1.5 1.5 0 0 1 4 14.5v-7A1.5 1.5 0 0 1 5.5 6Z" />
        </>
      );
    case "wallet":
      return (
        <>
          <path d="M5 8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5v7a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 15.5z" />
          <path d="M5.5 9H18" />
          <path d="M15.5 13h2" />
        </>
      );
    case "receipt":
      return (
        <>
          <path d="M7 4h10v16l-2-1.6L13 20l-2-1.6L9 20l-2-1.6L7 20z" />
          <path d="M9.5 9h5M9.5 13h5M9.5 17H13" />
        </>
      );
    case "userPlus":
      return (
        <>
          <circle cx="10" cy="8.5" r="3" />
          <path d="M5.5 19v-.7a4.8 4.8 0 0 1 4.8-4.8h1.4a4.8 4.8 0 0 1 4.8 4.8v.7" />
          <path d="M18 8v4M16 10h4" />
        </>
      );
    case "files":
      return (
        <>
          <path d="M9 5h7l3 3v9.5A2.5 2.5 0 0 1 16.5 20h-7A2.5 2.5 0 0 1 7 17.5V7.5A2.5 2.5 0 0 1 9.5 5Z" />
          <path d="M16 5v3h3" />
          <path d="M5 8v8.5A2.5 2.5 0 0 0 7.5 19" />
        </>
      );
    case "coins":
      return (
        <>
          <circle cx="8" cy="12" r="3.2" />
          <path d="M12 12h7M14.5 9.5H19M14.5 14.5H19" />
        </>
      );
    case "sun":
      return (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2.3M12 19.2v2.3M21.5 12h-2.3M4.8 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3" />
        </>
      );
    case "moon":
      return <path d="M14.5 3.8a7.8 7.8 0 1 0 5.7 12.3A8.8 8.8 0 0 1 14.5 3.8Z" />;
    case "briefcase":
      return (
        <>
          <rect x="4" y="7" width="16" height="11" rx="2.5" />
          <path d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7" />
          <path d="M4 11.5h16" />
        </>
      );
    case "compass":
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="m15.5 8.5-2.2 5.2-5.2 2.2 2.2-5.2z" />
        </>
      );
    case "chevronLeft":
      return <path d="m14.5 6-5 6 5 6" />;
    case "chevronRight":
      return <path d="m9.5 6 5 6-5 6" />;
    default:
      return null;
  }
}

export function getAdminGroupIcon(group: "core" | "client" | "hr" | "compliance" | "ops" | "audit" | "chat"): SidebarIconName {
  switch (group) {
    case "core":
      return "layout";
    case "client":
      return "building";
    case "hr":
      return "folder";
    case "compliance":
      return "shield";
    case "ops":
      return "calendar";
    case "audit":
      return "clipboard";
    case "chat":
      return "message";
    default:
      return "layout";
  }
}

export function getAdminPageIcon(pageKey: AdminPageKey): SidebarIconName {
  switch (pageKey) {
    case "enquiries":
      return "inbox";
    case "client_onboarding":
      return "building";
    case "module_control":
      return "layout";
    case "settings":
      return "sliders";
    case "document_allotment":
      return "folder";
    case "compliance_legal_docs":
      return "shield";
    case "compliance_trainings":
      return "sparkles";
    case "compliance_committee_meetings":
      return "users";
    case "holiday_master":
      return "calendar";
    case "shift_master":
      return "clock";
    case "in_out_generator":
      return "clock";
    case "program_audit":
      return "clipboard";
    case "audit_calendar":
      return "calendar";
    case "client_audit_log":
      return "files";
    case "training_calendar":
      return "calendar";
    case "dc_connect":
      return "message";
    default:
      return "layout";
  }
}

export function getClientPageIcon(pageKey: ClientPageKey): SidebarIconName {
  switch (pageKey) {
    case "employee_master":
      return "users";
    case "add_employee":
      return "userPlus";
    case "personal_documents":
      return "folder";
    case "payroll":
      return "wallet";
    case "payroll_data":
      return "files";
    case "payslip":
      return "receipt";
    case "payslip_data":
      return "files";
    case "advance":
      return "coins";
    case "advance_data":
      return "files";
    case "pf_challan":
      return "shield";
    case "esic_challan":
      return "shield";
    case "in_out":
      return "clock";
    case "in_out_data":
      return "files";
    case "compliance_legal_docs":
      return "shield";
    case "compliance_trainings":
      return "sparkles";
    case "compliance_committee_meetings":
      return "users";
    case "audit_dashboard":
      return "clipboard";
    case "training":
      return "sparkles";
    case "committees":
      return "users";
    case "dc_connect":
      return "message";
    default:
      return "layout";
  }
}

export function getClientSectionIcon(
  section: "dashboard" | "employee_data" | "salary" | "compliance" | "audit_module" | "chat"
): SidebarIconName {
  switch (section) {
    case "dashboard":
      return "home";
    case "employee_data":
      return "users";
    case "salary":
      return "wallet";
    case "compliance":
      return "shield";
    case "audit_module":
      return "clipboard";
    case "chat":
      return "message";
    default:
      return "layout";
  }
}

export function getSalarySubgroupIcon(
  subGroup: "payroll" | "advance" | "compliance" | "attendance"
): SidebarIconName {
  switch (subGroup) {
    case "payroll":
      return "wallet";
    case "advance":
      return "coins";
    case "compliance":
      return "shield";
    case "attendance":
      return "clock";
    default:
      return "layout";
  }
}
