import BrandedLoader from "@/components/BrandedLoader";

export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-var(--app-header-height))] bg-[linear-gradient(180deg,#dfe7f1_0%,#eef3f8_100%)] p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <BrandedLoader
          title="Opening page"
          subtitle="Preparing dashboard, payroll, and client records."
        />
      </div>
    </div>
  );
}
