"use client";

import { useMemo, useState } from "react";

const consultationTracks = [
  {
    title: "Compliance Review Session",
    detail: "Audit-readiness, statutory gaps, and documentation priorities.",
    badge: "Most Booked",
  },
  {
    title: "Payroll & HR Setup",
    detail: "Payroll structure, attendance flow, employee master, and challan process.",
    badge: "Operations",
  },
  {
    title: "Management Consultation",
    detail: "Long-term compliance planning for factory, HR, and policy controls.",
    badge: "Strategic",
  },
];

const outcomes = [
  "Structured review of your current compliance position",
  "Clear list of immediate action items",
  "Guidance on payroll, attendance, PF, ESIC, and audit preparation",
  "Recommended next steps for your team and records",
];

export default function BookConsultationPage() {
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consultationType, setConsultationType] = useState(consultationTracks[0].title);
  const [preferredSlot, setPreferredSlot] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const composedMessage = useMemo(() => {
    const parts = [
      `Consultation Type: ${consultationType}`,
      preferredSlot ? `Preferred Slot: ${preferredSlot}` : "",
      message.trim() ? `Requirement: ${message.trim()}` : "",
    ].filter(Boolean);
    return parts.join("\n");
  }, [consultationType, preferredSlot, message]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus("Submitting consultation request...");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          companyName,
          email,
          phone,
          message: composedMessage,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data?.message || "Failed to submit consultation request.");
        setSubmitting(false);
        return;
      }

      setStatus("Consultation request submitted successfully.");
      setFullName("");
      setCompanyName("");
      setEmail("");
      setPhone("");
      setConsultationType(consultationTracks[0].title);
      setPreferredSlot("");
      setMessage("");
    } catch {
      setStatus("Server error. Try again.");
    }

    setSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#dfe7f1_0%,#eef3f8_100%)]">
      <section className="mx-auto max-w-7xl px-6 py-12 md:px-8">
        <div className="overflow-hidden rounded-[36px] border border-white/60 bg-[radial-gradient(circle_at_top_left,#2948b6_0%,#182f7a_36%,#0f1c52_100%)] text-white shadow-[0_30px_90px_rgba(17,34,84,0.20)]">
          <div className="grid gap-8 p-8 md:p-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-cyan-200/90">
                Premium Consultation
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
                Book a focused compliance consultation
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-200 md:text-lg">
                Discuss compliance risks, payroll setup, audit preparation, and HR
                documentation with a structured consultation workflow built for factories,
                textile units, and growing teams.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {outcomes.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-sm font-semibold text-slate-100 backdrop-blur"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-white/12 bg-white/10 p-6 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Session Format
              </p>
              <div className="mt-5 space-y-4">
                {consultationTracks.map((track) => (
                  <div
                    key={track.title}
                    className="rounded-2xl border border-white/10 bg-slate-950/20 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-bold text-white">{track.title}</h2>
                      <span className="rounded-full bg-[#f7c63d] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-950">
                        {track.badge}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-200">{track.detail}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-cyan-200/15 bg-slate-950/20 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">
                  Contact
                </p>
                <p className="mt-3 text-sm font-semibold text-white">
                  +91 6353025552
                </p>
                <p className="mt-1 text-sm text-slate-200">
                  dwarkeshconsultancyahmedabad@gmail.com
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[32px] border border-slate-200/70 bg-white p-7 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Request Form
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Share your consultation requirement
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Send your business details, preferred consultation type, and timing preference.
              The team can then coordinate the right discussion with the right context.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <input
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
                  placeholder="Full Name *"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />

                <input
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
                  placeholder="Company Name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <input
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <input
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
                  placeholder="Phone *"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <select
                  value={consultationType}
                  onChange={(e) => setConsultationType(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
                >
                  {consultationTracks.map((track) => (
                    <option key={track.title} value={track.title}>
                      {track.title}
                    </option>
                  ))}
                </select>

                <input
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
                  placeholder="Preferred day / time"
                  value={preferredSlot}
                  onChange={(e) => setPreferredSlot(e.target.value)}
                />
              </div>

              <textarea
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
                placeholder="Tell us what you need help with"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
              />

              <button
                type="submit"
                disabled={submitting}
                className="rounded-2xl bg-[#f7c63d] px-6 py-3 font-bold text-slate-950 transition hover:bg-[#ffd457] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Book Consultation"}
              </button>

              {status && (
                <p className="text-sm font-semibold text-slate-700">{status}</p>
              )}
            </form>
          </section>

          <section className="rounded-[32px] border border-slate-200/70 bg-white p-7 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              What To Expect
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Structured, practical guidance
            </h2>

            <div className="mt-6 space-y-4">
              {[
                {
                  title: "1. Requirement Review",
                  body: "We review your current challenge, business context, and urgency before the session.",
                },
                {
                  title: "2. Consultation Session",
                  body: "A focused discussion on compliance, payroll, documents, attendance, audits, or setup issues.",
                },
                {
                  title: "3. Action Direction",
                  body: "You leave with a clearer next-step path instead of a vague advisory call.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] p-5"
                >
                  <h3 className="text-lg font-bold text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[28px] bg-[linear-gradient(135deg,#0f1d53_0%,#173ca2_58%,#2f6df3_100%)] p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
                Prefer a direct enquiry first?
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-100">
                If you are not ready to schedule yet, send a broader requirement summary first
                and the team can guide you to the right next step.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href="/enquire-now"
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
                >
                  Enquire Now
                </a>
                <a
                  href="/services"
                  className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
                >
                  View Services
                </a>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
