"use client";

import Link from "next/link";
import { useState } from "react";

export default function SignInPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus("Logging in...");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameOrEmail, password }),
      });

      const data = await res.json();
      const payload = data?.data ?? data;

      if (!res.ok) {
        setStatus(data.message || "Invalid username/email or password.");
        setLoading(false);
        return;
      }

      if (payload.redirectTo) {
        window.location.href = payload.redirectTo;
        return;
      }

      if (payload.role === "admin") {
        window.location.href = "/admin";
        return;
      }

      if (payload.role === "client") {
        window.location.href = "/client-dashboard";
        return;
      }

      setStatus("Login succeeded but role mapping failed. Please contact support.");
    } catch {
      setStatus("Server error. Please try again.");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#dfe7f1_0%,#eef3f8_100%)] px-6 py-12">
      <section className="mx-auto grid min-h-[calc(100vh-10rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="overflow-hidden rounded-[34px] border border-white/60 bg-[radial-gradient(circle_at_top_left,#2948b6_0%,#182f7a_38%,#0f1c52_100%)] p-8 text-white shadow-[0_30px_90px_rgba(17,34,84,0.20)] md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-cyan-200/90">
            Secure Access
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
            Sign in
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-200 md:text-lg">
            Access your company dashboard.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Dashboard Access</p>
              <p className="mt-2 text-sm font-semibold text-white">
                Employees, payroll, attendance, documents, and compliance workflows.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Support</p>
              <p className="mt-2 text-sm font-semibold text-white">
                Need access?
              </p>
              <p className="mt-1 break-words text-sm font-semibold text-white">
                dwarkeshconsultancyahmedabad@gmail.com
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[34px] border border-slate-200/70 bg-white p-8 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Account Login
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Sign in
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Enter your username or email and password to continue.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 grid gap-5">
            <div>
              <label className="text-sm font-semibold text-slate-700">Username / Email</label>
              <input
                className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
                placeholder="Enter username or email"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-semibold text-slate-700">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-semibold text-blue-900 transition hover:text-blue-700"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-[#f7c63d] px-6 py-3 font-bold text-slate-950 transition hover:bg-[#ffd457] disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Sign in"}
            </button>

            {status && (
              <p className="text-center text-sm font-semibold text-slate-700">{status}</p>
            )}

            <p className="text-center text-sm text-slate-500">
              Need access? Email: dwarkeshconsultancyahmedabad@gmail.com
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
