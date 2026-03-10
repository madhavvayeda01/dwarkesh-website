"use client";
import Image from "next/image";

type BrandedLoaderProps = {
  title?: string;
  subtitle?: string;
  compact?: boolean;
};

export default function BrandedLoader({
  title = "Loading workspace",
  subtitle = "Syncing client access, records, and payroll views.",
  compact = false,
}: BrandedLoaderProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[32px] border border-white/50 bg-[radial-gradient(circle_at_top_left,#264bb9_0%,#173483_35%,#0f1d53_100%)] text-white shadow-[0_28px_80px_rgba(17,34,84,0.22)] ${
        compact ? "p-5" : "p-8 md:p-10"
      }`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.1)_35%,transparent_70%)] animate-[pulse_2.6s_ease-in-out_infinite]" />
      <div className="relative">
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[24px] border border-white/20 bg-[#001136] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_22px_rgba(10,23,60,0.24)]">
            <Image
              src="/logo.jpg"
              alt="Dwarkesh Consultancy"
              className="h-full w-full object-contain p-[4px]"
              width={80}
              height={80}
              priority={compact}
            />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-white/15" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200/90">
              Dwarkesh Consultancy
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-200">{subtitle}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur"
            >
              <div className="h-3 w-24 rounded-full bg-white/20" />
              <div className="mt-4 h-8 rounded-full bg-white/10" />
              <div className="mt-3 h-8 w-4/5 rounded-full bg-white/10" />
              <div className="mt-4 flex gap-2">
                <div className="h-2 flex-1 rounded-full bg-cyan-200/35" />
                <div className="h-2 flex-1 rounded-full bg-[#f7c63d]/60" />
                <div className="h-2 flex-1 rounded-full bg-white/20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
