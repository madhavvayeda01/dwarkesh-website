export default function ServicesPage() {
  const services = [
    {
      title: "HR Compliance & Employee Documentation",
      desc: "Complete employee master handling and legally required HR documentation support.",
    },
    {
      title: "Employee Master Data Management",
      desc: "Structured employee records with editable details, bulk upload, and export support.",
    },
    {
      title: "Appointment, Confirmation & Exit Documentation",
      desc: "Generate HR documents using employee master data with template-based exports.",
    },
    {
      title: "PF & ESIC Enrollment Support",
      desc: "Request and track PF/ESIC enrollment activities in a systematic workflow.",
    },
    {
      title: "Payroll Support (Legal Payroll Preparation)",
      desc: "Convert client payment data into legal payroll format with compliance-ready output.",
    },
    {
      title: "Payslip Generation & Payroll Documentation",
      desc: "Generate payslips and payroll documentation month-wise for audit and legal use.",
    },
    {
      title: "Audit Readiness Support",
      desc: "Support for GRS, GOTS, OCS, RCS, SEDEX, SCAN, Inditex, and brand audits.",
    },
    {
      title: "Legal Document Review & Corrective Updates",
      desc: "Upload, review, correct, and re-upload legal documents with tracking support.",
    },
    {
      title: "Training & Committee Meeting Compliance Support",
      desc: "Calendar-based reminders for trainings and committee meetings with due alerts.",
    },
    {
      title: "Consultation & Ongoing Compliance Guidance",
      desc: "Get professional guidance, support, and consultation for compliance improvement.",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100">
      
      {/* Page Title */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-extrabold text-blue-950 md:text-4xl">
          Products & Services
        </h1>

        <p className="mt-3 max-w-3xl text-slate-600">
          We provide structured compliance solutions with professional guidance to help your
          business stay audit-ready and legally compliant.
        </p>

        {/* Service Cards */}
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {services.map((s) => (
            <div
              key={s.title}
              className="rounded-3xl bg-white p-7 shadow-md transition hover:shadow-xl"
            >
              <h3 className="text-lg font-bold text-blue-950">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{s.desc}</p>

              <div className="mt-4 flex gap-3">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900">
                  Compliance
                </span>
                <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                  Premium Support
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-3xl bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 p-10 text-white shadow-xl">
          <h2 className="text-2xl font-bold">Need help with compliance?</h2>
          <p className="mt-2 text-blue-100">
            Share your requirement and our team will guide you with the best solution.
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
      </section>

    </main>
  );
}
