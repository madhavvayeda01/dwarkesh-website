"use client";

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

      setStatus("Login succeeded but role mapping failed. Please contact admin.");
    } catch {
      setStatus("Server error. Please try again.");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-md">
        <h1 className="text-3xl font-extrabold text-blue-950 text-center">
          Sign In
        </h1>

        <p className="mt-2 text-center text-slate-600">
          One login for admin and client users.
        </p>

        <form onSubmit={handleLogin} className="mt-8 grid gap-5">
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Username / Email
            </label>
            <input
              className="mt-1 w-full rounded-xl border bg-white px-4 py-3 text-slate-900"
              placeholder="Enter admin username or client email"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Password
            </label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border bg-white px-4 py-3 text-slate-900"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-yellow-500 px-6 py-3 font-semibold text-blue-950 hover:bg-yellow-400 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          {status && (
            <p className="text-center text-sm font-semibold text-slate-700">{status}</p>
          )}

          <p className="text-center text-xs text-slate-500">
            Admin credentials are configured in environment variables.
          </p>
        </form>
      </div>
    </main>
  );
}
