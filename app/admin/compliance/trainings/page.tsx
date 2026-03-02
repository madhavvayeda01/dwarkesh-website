import Sidebar from "@/components/Sidebar";
import ComplianceScheduleAdminPage from "@/components/compliance/ComplianceScheduleAdminPage";

export default function AdminComplianceTrainingsPage() {
  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
      <Sidebar />
      <main className="flex-1 p-8">
        <ComplianceScheduleAdminPage
          category="TRAINING"
          pageTitle="Compliance Trainings"
          helperText="Upload training templates, generate future training dates with a 3-month interval, and publish downloadable PDFs for clients."
        />
      </main>
    </div>
  );
}
