"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;

    async function validateToken() {
      if (!token) {
        setStatus("Reset link is missing or invalid.");
        setTokenValid(false);
        setValidating(false);
        return;
      }

      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        const body = await res.json().catch(() => ({}));
        if (!active) return;

        if (!res.ok) {
          setTokenValid(false);
          setStatus(body?.message || "This reset link is invalid or has expired.");
        } else {
          setTokenValid(true);
          setStatus("");
        }
      } catch {
        if (!active) return;
        setTokenValid(false);
        setStatus("Unable to verify this reset link right now.");
      } finally {
        if (active) {
          setValidating(false);
        }
      }
    }

    void validateToken();
    return () => {
      active = false;
    };
  }, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("Resetting password...");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(body?.message || "Failed to reset password.");
        return;
      }

      setTokenValid(false);
      setPassword("");
      setConfirmPassword("");
      setStatus("Password reset successful. You can now sign in with your new password.");
    } catch {
      setStatus("Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#dfe7f1_0%,#eef3f8_100%)] px-6 py-12">
      <section className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-3xl items-center">
        <div className="w-full rounded-[34px] border border-slate-200/70 bg-white p-8 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Account Recovery
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
            Reset password
          </h1>
          <p className="mt-4 text-base leading-8 text-slate-600">
            Choose a new password with at least 8 characters, including uppercase, lowercase,
            and a number.
          </p>

          {validating ? (
            <p className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              Validating reset link...
            </p>
          ) : tokenValid ? (
            <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
              <div>
                <label className="text-sm font-semibold text-slate-700">New password</label>
                <input
                  type="password"
                  className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Confirm password</label>
                <input
                  type="password"
                  className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="rounded-2xl bg-[#f7c63d] px-5 py-3 font-bold text-slate-950 transition hover:bg-[#ffd457] disabled:opacity-50"
              >
                {loading ? "Resetting..." : "Reset password"}
              </button>
            </form>
          ) : null}

          {status ? (
            <p className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              {status}
            </p>
          ) : null}

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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[linear-gradient(180deg,#dfe7f1_0%,#eef3f8_100%)] px-6 py-12">
          <section className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-3xl items-center">
            <div className="w-full rounded-[34px] border border-slate-200/70 bg-white p-8 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-10">
              <p className="text-sm font-semibold text-slate-700">Loading reset link...</p>
            </div>
          </section>
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
