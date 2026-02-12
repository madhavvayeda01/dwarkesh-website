export default function BusinessPartnersPage() {
  // Later this will come from Admin Panel + Database
  const partners = [
    { name: "Sharvaay", type: "Compliance Support" },
    { name: "100 Rayon", type: "HR & Payroll" },
    { name: "Sumicot PVT. LTD.", type: "Audit & Documentation" },
    { name: "Bhaskar silk mills", type: "Training & Committee Support" },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-extrabold text-blue-950 md:text-4xl">
        Business Partners
      </h1>

      <p className="mt-3 max-w-3xl text-slate-600">
        Our trusted partners help us deliver end-to-end compliance, HR documentation, payroll
        support, and audit readiness services.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {partners.map((p) => (
          <div
            key={p.name}
            className="rounded-3xl bg-white p-7 shadow-md transition hover:shadow-xl"
          >
            <h3 className="text-lg font-bold text-blue-950">{p.name}</h3>
            <p className="mt-2 text-sm text-slate-600">{p.type}</p>

            <div className="mt-4 flex gap-3">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900">
                Verified Partner
              </span>
              <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                Added via Admin Panel (Phase 2)
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-3xl bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 p-10 text-white shadow-xl">
        <h2 className="text-2xl font-bold">Want to become a partner?</h2>
        <p className="mt-2 text-blue-100">
          Send your details and we will connect with you for collaboration opportunities.
        </p>

        <div className="mt-6 flex flex-wrap gap-4">
          <a
            href="/enquire-now"
            className="rounded-2xl bg-yellow-500 px-6 py-3 font-semibold text-blue-950 hover:bg-yellow-400"
          >
            Enquire Now
          </a>

          <a
            href="/book-consultation"
            className="rounded-2xl bg-white/10 px-6 py-3 font-semibold text-white hover:bg-white/20"
          >
            Book Consultation
          </a>
        </div>
      </div>
    </main>
  );
}
