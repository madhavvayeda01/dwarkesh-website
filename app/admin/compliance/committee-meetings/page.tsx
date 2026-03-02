import Sidebar from "@/components/Sidebar";
import ComplianceScheduleAdminPage from "@/components/compliance/ComplianceScheduleAdminPage";

export default function AdminComplianceCommitteeMeetingsPage() {
  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
      <Sidebar />
      <main className="flex-1 p-8">
        <ComplianceScheduleAdminPage
          category="COMMITTEE"
          pageTitle="Committee Meetings"
          helperText="Upload committee meeting formats, generate future schedules with compliant spacing, and publish downloadable meeting files for clients."
        />
      </main>
    </div>
  );
}
