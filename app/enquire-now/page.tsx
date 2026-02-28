"use client";

import { useMemo, useState } from "react";
import { createLeadSchema, type CreateLeadInput } from "@/lib/validation/lead";

type FieldErrors = Partial<Record<keyof CreateLeadInput, string>>;

const emptyForm: CreateLeadInput = {
  fullName: "",
  companyName: "",
  phone: "",
  email: "",
  message: "",
};

export default function EnquireNowPage() {
  const [form, setForm] = useState<CreateLeadInput>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const hasSuccess = useMemo(() => Boolean(submittedAt), [submittedAt]);

  function updateField<K extends keyof CreateLeadInput>(key: K, value: CreateLeadInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");
    setSubmittedAt(null);

    const parsed = createLeadSchema.safeParse(form);
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        fullName: flattened.fullName?.[0],
        companyName: flattened.companyName?.[0],
        phone: flattened.phone?.[0],
        email: flattened.email?.[0],
        message: flattened.message?.[0],
      });
      setStatus("Please correct the form fields and try again.");
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setStatus("Submitting enquiry...");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const flattened = data?.fieldErrors || {};
        if (flattened?.fullName || flattened?.companyName || flattened?.phone || flattened?.email || flattened?.message) {
          setFieldErrors({
            fullName: flattened.fullName?.[0],
            companyName: flattened.companyName?.[0],
            phone: flattened.phone?.[0],
            email: flattened.email?.[0],
            message: flattened.message?.[0],
          });
        }
        setStatus(data?.message || "Failed to submit enquiry.");
        setSubmitting(false);
        return;
      }

      setForm(emptyForm);
      setSubmittedAt(new Date().toLocaleString("en-IN"));
      setStatus("");
    } catch {
      setStatus("Server error. Please try again.");
    }

    setSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#dfe7f1_0%,#eef3f8_100%)]">
      <section className="mx-auto max-w-7xl px-6 py-12 md:px-8">
        <div className="overflow-hidden rounded-[36px] border border-white/60 bg-[radial-gradient(circle_at_top_left,#2948b6_0%,#182f7a_36%,#0f1c52_100%)] text-white shadow-[0_30px_90px_rgba(17,34,84,0.20)]">
          <div className="grid gap-8 p-8 md:p-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-cyan-200/90">
                Enquiry Desk
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
                Enquire now
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-200 md:text-lg">
                Send your requirement with full business details and the team can review your
                enquiry with the right context from the start.
              </p>
            </div>

            <div className="rounded-[30px] border border-white/12 bg-white/10 p-6 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Contact
              </p>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Email</p>
                  <p className="mt-2 break-words text-sm font-semibold text-white">
                    dwarkeshconsultancyahmedabad@gmail.com
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Phone</p>
                  <p className="mt-2 text-sm font-semibold text-white">+91 6353025552</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Use This Form For</p>
                  <p className="mt-2 text-sm leading-7 text-slate-200">
                    Compliance review, payroll support, HR documentation, audit preparation, or
                    ongoing consultancy requirements.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[32px] border border-slate-200/70 bg-white p-7 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Enquiry Form
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Send your requirement
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              All fields below are required so the enquiry can be reviewed without follow-up for
              missing details.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-5" noValidate>
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="fullName" className="text-sm font-semibold text-slate-700">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    value={form.fullName}
                    onChange={(e) => updateField("fullName", e.target.value)}
                    aria-invalid={Boolean(fieldErrors.fullName)}
                    aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined}
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
                    required
                  />
                  {fieldErrors.fullName && (
                    <p id="fullName-error" className="mt-1 text-sm font-semibold text-red-600">
                      {fieldErrors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="companyName" className="text-sm font-semibold text-slate-700">
                    Company Name
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    value={form.companyName}
                    onChange={(e) => updateField("companyName", e.target.value)}
                    aria-invalid={Boolean(fieldErrors.companyName)}
                    aria-describedby={fieldErrors.companyName ? "companyName-error" : undefined}
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
                    required
                  />
                  {fieldErrors.companyName && (
                    <p id="companyName-error" className="mt-1 text-sm font-semibold text-red-600">
                      {fieldErrors.companyName}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="phone" className="text-sm font-semibold text-slate-700">
                    Phone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+91 9876543210"
                    maxLength={14}
                    aria-invalid={Boolean(fieldErrors.phone)}
                    aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
                    required
                  />
                  {fieldErrors.phone && (
                    <p id="phone-error" className="mt-1 text-sm font-semibold text-red-600">
                      {fieldErrors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? "email-error" : undefined}
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
                    required
                  />
                  {fieldErrors.email && (
                    <p id="email-error" className="mt-1 text-sm font-semibold text-red-600">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="message" className="text-sm font-semibold text-slate-700">
                  Message / Requirement
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  value={form.message}
                  onChange={(e) => updateField("message", e.target.value)}
                  aria-invalid={Boolean(fieldErrors.message)}
                  aria-describedby={fieldErrors.message ? "message-error" : undefined}
                  className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
                  required
                />
                {fieldErrors.message && (
                  <p id="message-error" className="mt-1 text-sm font-semibold text-red-600">
                    {fieldErrors.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-2xl bg-[#f7c63d] px-6 py-3 font-bold text-slate-950 transition hover:bg-[#ffd457] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit Enquiry"}
              </button>

              {status && !hasSuccess && (
                <p aria-live="polite" className="text-sm font-semibold text-slate-700">
                  {status}
                </p>
              )}
            </form>
          </section>

          <section className="rounded-[32px] border border-slate-200/70 bg-white p-7 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Submission Status
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Confirmation
            </h2>

            {hasSuccess ? (
              <div className="mt-6 rounded-[28px] border border-emerald-200 bg-[linear-gradient(180deg,#f2fff8_0%,#ecfdf5_100%)] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                  Submitted
                </p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  Your enquiry has been received
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  The request has been recorded successfully. The team can now review your
                  details and reach out using the provided phone number or email.
                </p>
                <p className="mt-4 text-sm font-semibold text-emerald-800">
                  Submitted at: {submittedAt}
                </p>
              </div>
            ) : (
              <div className="mt-6 rounded-[28px] bg-[linear-gradient(135deg,#0f1d53_0%,#173ca2_58%,#2f6df3_100%)] p-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  Before You Submit
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-100">
                  <li>Provide the correct company name so the enquiry can be routed properly.</li>
                  <li>Use an active email address and phone number for follow-up.</li>
                  <li>Describe the requirement clearly to reduce back-and-forth.</li>
                </ul>
              </div>
            )}

            {!hasSuccess && status && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {status}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
