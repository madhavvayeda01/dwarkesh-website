import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PublicPartner = {
  id: string;
  name: string;
  logoUrl: string | null;
  location: string;
};

function initials(name: string | null | undefined) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return "BP";
  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

function extractPublicLocation(address: string | null | undefined) {
  const raw = String(address || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (raw.length === 0) return "Location shared after confirmation";
  if (raw.length === 1) return raw[0];

  return raw[raw.length - 2] || raw[raw.length - 1] || "Location shared after confirmation";
}

export default async function BusinessPartnersPage() {
  const partnerRows = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      logoUrl: true,
      address: true,
    },
    orderBy: { name: "asc" },
  });

  const partners: PublicPartner[] = partnerRows.map((partner) => ({
    id: partner.id,
    name: partner.name?.trim() || "Registered Partner",
    logoUrl: partner.logoUrl,
    location: extractPublicLocation(partner.address),
  }));

  const partnerCount = partners.length;

  return (
    <main className="mx-auto max-w-7xl px-6 py-12 md:px-8">
      <section className="overflow-hidden rounded-[36px] border border-white/60 bg-[radial-gradient(circle_at_top_left,#2948b6_0%,#182f7a_36%,#0f1c52_100%)] text-white shadow-[0_30px_90px_rgba(17,34,84,0.20)]">
        <div className="grid gap-8 p-8 md:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.36em] text-cyan-200/90">
              Registered Network
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
              Business Partners
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-200 md:text-lg">
              Verified company profiles from the current client database. Public view shows only
              safe partner identity details.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Total Partners</p>
              <p className="mt-3 text-4xl font-black">{partnerCount}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Data Source</p>
              <p className="mt-3 text-lg font-bold">Live Client Registry</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Profile View</p>
              <p className="mt-3 text-lg font-bold">Company + Location</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        {partners.length === 0 ? (
          <div className="rounded-[32px] border border-slate-200 bg-white p-10 text-center shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
              No Partners Yet
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
              No registered companies found
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              This section will automatically populate when client companies are created in the
              admin panel.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {partners.map((partner) => (
              <article
                key={partner.id}
                className="group relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.14)]"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d4ed8_0%,#3b82f6_45%,#f7c63d_100%)]" />

                <div className="relative p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[26px] border border-slate-200 bg-[linear-gradient(135deg,#dbeafe_0%,#f8fafc_100%)] text-2xl font-black tracking-tight text-blue-950 shadow-inner">
                      {partner.logoUrl ? (
                        <img
                          src={partner.logoUrl}
                          alt={partner.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials(partner.name)
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-900">
                          Registered Partner
                        </span>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">
                          Verified Partner
                        </span>
                      </div>

                      <h2 className="mt-4 line-clamp-2 text-2xl font-black tracking-tight text-slate-950">
                        {partner.name}
                      </h2>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Company Name
                      </p>
                      <p className="mt-2 text-base font-bold text-slate-900">
                        {partner.name}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          City / State
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {partner.location}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          Status
                        </p>
                        <p className="mt-2 text-sm font-semibold text-emerald-700">
                          Verified Partner
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="mt-6 text-sm font-semibold text-slate-600">
          Partner contact details are shared only after confirmation.
        </p>
      </section>

      <section className="mt-10 overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#0f1d53_0%,#173ca2_58%,#2f6df3_100%)] p-8 text-white shadow-[0_24px_70px_rgba(17,34,84,0.18)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200">
              Collaboration
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              Want to become a listed partner?
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-200">
              Share your company details and we can evaluate your profile for long-term
              collaboration across compliance, payroll, training, and documentation support.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <a
              href="/enquire-now"
              className="rounded-2xl bg-[#f7c63d] px-6 py-3 font-bold text-slate-950 transition hover:bg-[#ffd457]"
            >
              Enquire Now
            </a>
            <a
              href="/book-consultation"
              className="rounded-2xl border border-white/15 bg-white/10 px-6 py-3 font-bold text-white transition hover:bg-white/15"
            >
              Book Consultation
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
