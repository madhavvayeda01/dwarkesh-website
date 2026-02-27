export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-100">
      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="rounded-3xl bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 p-10 text-white shadow-xl">
          <h1 className="text-3xl font-extrabold md:text-5xl">
            Compliance Made Simple.
          </h1>

          <p className="mt-4 max-w-2xl text-base text-blue-100 md:text-lg">
            Dwarkesh Consultancy helps businesses manage HR compliance, payroll support,
            audit readiness, and legal documentation with a structured digital system.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="/signin"
              className="rounded-2xl bg-yellow-500 px-6 py-3 font-semibold text-blue-950 hover:bg-yellow-400"
            >
              Sign In
            </a>

            <a
              href="/enquire-now"
              className="rounded-2xl bg-white/10 px-6 py-3 font-semibold text-white hover:bg-white/20"
            >
              Enquire Now
            </a>

            <a
              href="/book-consultation"
              className="rounded-2xl border border-white/30 px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              Book Consultation
            </a>
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="text-2xl font-bold text-blue-950">What We Help With</h2>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "HR Compliance & Documentation",
              desc: "Employee master management and legally required HR documentation.",
            },
            {
              title: "Payroll Support",
              desc: "Client payment data handling and legal payroll preparation support.",
            },
            {
              title: "Audit Readiness",
              desc: "GRS, GOTS, SEDEX, SCAN, Inditex and brand audits support.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl bg-white p-6 shadow-md hover:shadow-lg"
            >
              <h3 className="text-lg font-semibold text-blue-950">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
