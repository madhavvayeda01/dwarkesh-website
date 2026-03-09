"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("Sending reset instructions...");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => ({}));
      setStatus(
        body?.message ||
          "If an account exists for that email, a password reset link will be sent shortly."
      );
    } catch {
      setStatus("Unable to process the request right now. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#dfe7f1_0%,#eef3f8_100%)] px-6 py-12">
      <section className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-3xl items-center">
        <div className="w-full rounded-[34px] border border-slate-200/70 bg-white p-8 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Password Support
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
            Forgot password?
          </h1>
          <p className="mt-4 text-base leading-8 text-slate-600">
            Enter the email registered for your client or consultant account. If it exists, a
            one-time reset link will be sent without exposing whether the account was found.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
            <div>
              <label className="text-sm font-semibold text-slate-700">Registered email</label>
              <input
                type="email"
                className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
                placeholder="Enter your email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-[#f7c63d] px-5 py-3 font-bold text-slate-950 transition hover:bg-[#ffd457] disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>

            {status ? (
              <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                {status}
              </p>
            ) : null}
          </form>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signin"
              className="rounded-2xl border border-slate-300 px-5 py-3 font-bold text-slate-800 transition hover:bg-slate-50"
            >
              Back to Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

