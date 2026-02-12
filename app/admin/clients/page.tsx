"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function AdminClientsPage() {
  useEffect(() => {
    async function checkLogin() {
      const res = await fetch("/api/admin/me");
      const data = await res.json();
      if (!data.loggedIn) window.location.href = "/signin";
    }
    checkLogin();
  }, []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [address, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  const [logoUrl, setLogoUrl] = useState<string>("");

  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function handleLogoUpload(file: File) {
    setUploading(true);
    setStatus("Uploading logo...");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/upload/client-logo", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(`❌ ${data.message || "Logo upload failed"}`);
      setUploading(false);
      return;
    }

    setLogoUrl(data.logoUrl);
    setStatus("✅ Logo uploaded successfully!");
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus("Creating client...");

    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          logoUrl,
          address,
          contactNumber,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus(`❌ ${data.message || "Failed to create client"}`);
        setLoading(false);
        return;
      }

      setStatus("✅ Client created successfully!");
      setName("");
      setEmail("");
      setPassword("");
      setAddress("");
      setContactNumber("");
      setLogoUrl("");
    } catch (err) {
      setStatus("❌ Server error, try again.");
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 py-12">
          <h1 className="text-3xl font-extrabold text-blue-950 md:text-4xl">
            Client Onboarding
          </h1>

          <p className="mt-2 text-slate-600">
            Add new clients so they can login from <b>/signin</b>.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 rounded-3xl bg-white p-8 shadow-md"
          >
            <div className="grid gap-5 md:grid-cols-2">
              {/* Logo Upload */}
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">
                  Client Logo
                </label>

                <div className="mt-2 flex flex-wrap items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleLogoUpload(f);
                    }}
                    className="w-full max-w-md rounded-xl border bg-white px-4 py-2"
                  />

                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt="Client Logo"
                      className="h-14 w-14 rounded-xl border object-cover"
                    />
                  )}
                </div>

                {uploading && (
                  <p className="mt-2 text-sm font-semibold text-slate-600">
                    Uploading...
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Client Name *
                </label>
                <input
                  className="mt-1 w-full rounded-xl border px-4 py-3"
                  placeholder="Client Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Client Email *
                </label>
                <input
                  type="email"
                  className="mt-1 w-full rounded-xl border px-4 py-3"
                  placeholder="Client Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Password *
                </label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-xl border px-4 py-3"
                  placeholder="Set Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Contact Number
                </label>
                <input
                  className="mt-1 w-full rounded-xl border px-4 py-3"
                  placeholder="9876543210"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-slate-700">
                  Address
                </label>
                <textarea
                  className="mt-1 w-full rounded-xl border px-4 py-3"
                  placeholder="Client Address"
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={loading || uploading}
                  className="w-full rounded-2xl bg-yellow-500 px-6 py-3 font-semibold text-blue-950 hover:bg-yellow-400 disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Client"}
                </button>

                {status && (
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    {status}
                  </p>
                )}
              </div>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
