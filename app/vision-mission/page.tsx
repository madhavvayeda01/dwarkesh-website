export default function VisionMissionPage() {
  return (
    <main className="min-h-screen bg-slate-100">
      {/* Page Content */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-extrabold text-blue-950 md:text-4xl">
          Vision & Mission
        </h1>

        <p className="mt-3 max-w-3xl text-slate-600">
          We help businesses stay compliant by simplifying HR documentation, payroll support,
          audit readiness, and legal record management through a structured digital system.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {/* Vision */}
          <div className="rounded-3xl bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 p-8 text-white shadow-xl">
            <h2 className="text-2xl font-bold">Our Vision</h2>
            <p className="mt-3 text-blue-100">
              To become a trusted compliance partner for businesses by simplifying HR, payroll,
              and audit processes through structured systems and professional guidance.
            </p>
          </div>

          {/* Mission */}
          <div className="rounded-3xl bg-white p-8 shadow-xl">
            <h2 className="text-2xl font-bold text-blue-950">Our Mission</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-700">
              <li>To support businesses with accurate legal documentation.</li>
              <li>To help clients stay audit-ready at all times.</li>
              <li>To reduce compliance risk through timely reviews & corrective actions.</li>
              <li>To provide smooth and reliable consultancy support through technology.</li>
              <li>To maintain confidentiality, accuracy, and professionalism in every service.</li>
            </ul>
          </div>
        </div>

        {/* Values */}
        <div className="mt-10 rounded-3xl bg-white p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-blue-950">Our Values</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-5">
            {["Integrity", "Confidentiality", "Accuracy", "Commitment", "Support"].map(
              (value) => (
                <div
                  key={value}
                  className="rounded-2xl bg-slate-50 p-4 text-center font-semibold text-blue-950"
                >
                  {value}
                </div>
              )
            )}
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="/enquire-now"
              className="rounded-2xl bg-blue-900 px-6 py-3 font-semibold text-white hover:bg-blue-800"
            >
              Enquire Now
            </a>

            <a
              href="/book-consultation"
              className="rounded-2xl bg-yellow-500 px-6 py-3 font-semibold text-blue-950 hover:bg-yellow-400"
            >
              Book Consultation
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
