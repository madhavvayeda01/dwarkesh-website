export default function HomePage() {
  const pricingPlans = [
    {
      name: "Starter",
      price: "\u20b95,000/month",
      description: "For smaller teams that need a reliable monthly compliance baseline.",
      deliverables: [
        "HR document setup and maintenance",
        "Employee master review and updates",
        "Basic monthly payroll support",
        "Compliance checklist guidance",
        "Email-based query support",
      ],
    },
    {
      name: "Standard",
      price: "\u20b910,000/month",
      description: "For growing companies that need stronger payroll and compliance coverage.",
      deliverables: [
        "Full HR documentation support",
        "Monthly payroll processing assistance",
        "Attendance and payroll data review",
        "Audit document preparation support",
        "Priority support for compliance issues",
      ],
    },
    {
      name: "Premium",
      price: "\u20b920,000/month",
      description: "For businesses that need deeper operational support and audit readiness.",
      deliverables: [
        "Advanced HR and statutory documentation",
        "End-to-end payroll and payslip support",
        "Audit readiness review and coordination",
        "Ongoing compliance monitoring",
        "Dedicated consultation support",
      ],
    },
  ];

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

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-3xl bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 p-8 text-white shadow-xl md:p-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">
              Pricing
            </p>
            <h2 className="mt-3 text-3xl font-extrabold md:text-4xl">
              Choose the level of support your company needs.
            </h2>
            <p className="mt-4 text-base leading-7 text-blue-100">
              Simple monthly plans for compliance documentation, payroll support, and
              audit readiness. Final scope can be adjusted after consultation.
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {pricingPlans.map((plan, index) => (
              <div
                key={plan.name}
                className={`rounded-3xl border p-6 shadow-lg transition hover:-translate-y-1 ${
                  index === 1
                    ? "border-yellow-400 bg-white text-slate-900"
                    : "border-white/15 bg-white/10 text-white backdrop-blur"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-extrabold">{plan.name}</h3>
                    <p
                      className={`mt-2 text-sm ${
                        index === 1 ? "text-slate-600" : "text-blue-100"
                      }`}
                    >
                      {plan.description}
                    </p>
                  </div>
                  {index === 1 ? (
                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-yellow-700">
                      Popular
                    </span>
                  ) : null}
                </div>

                <div className="mt-6">
                  <p
                    className={`text-sm uppercase tracking-[0.2em] ${
                      index === 1 ? "text-slate-500" : "text-cyan-200"
                    }`}
                  >
                    Starting at
                  </p>
                  <p className="mt-2 text-3xl font-black">{plan.price}</p>
                </div>

                <ul className="mt-6 space-y-3">
                  {plan.deliverables.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span
                        className={`mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${
                          index === 1 ? "bg-blue-700" : "bg-yellow-400"
                        }`}
                      />
                      <span
                        className={`text-sm leading-6 ${
                          index === 1 ? "text-slate-700" : "text-slate-100"
                        }`}
                      >
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex flex-col gap-3">
                  <a
                    href="/book-consultation"
                    className={`rounded-2xl px-5 py-3 text-center font-semibold transition ${
                      index === 1
                        ? "bg-blue-900 text-white hover:bg-blue-800"
                        : "bg-yellow-500 text-blue-950 hover:bg-yellow-400"
                    }`}
                  >
                    Book Consultation
                  </a>

                  <a
                    href="/enquire-now"
                    className={`rounded-2xl border px-5 py-3 text-center font-semibold transition ${
                      index === 1
                        ? "border-slate-300 text-slate-800 hover:bg-slate-50"
                        : "border-white/25 text-white hover:bg-white/10"
                    }`}
                  >
                    Enquire Now
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
