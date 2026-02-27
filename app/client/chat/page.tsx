"use client";

import { useEffect, useState } from "react";
import ClientSidebar from "@/components/ClientSidebar";

type ChatMessage = {
  id: string;
  sender: "client" | "admin";
  text: string;
  createdAt: string;
};

export default function ClientChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [moduleEnabled, setModuleEnabled] = useState<boolean | null>(null);

  async function loadMessages() {
    const res = await fetch("/api/client/chat", { cache: "no-store" });
    const data = await res.json();
    const payload = data?.data ?? data;
    setMessages(payload.messages || []);
  }

  useEffect(() => {
    async function checkLoginAndLoad() {
      const me = await fetch("/api/client/me");
      const meData = await me.json();
      const loggedIn = meData?.data?.loggedIn ?? meData?.loggedIn ?? false;
      if (!loggedIn) {
        window.location.href = "/signin";
        return;
      }
      const accessRes = await fetch("/api/client/modules?module=chat", { cache: "no-store" });
      const accessData = await accessRes.json().catch(() => ({}));
      if (!accessRes.ok || !accessData?.data?.enabled) {
        setModuleEnabled(false);
        return;
      }
      setModuleEnabled(true);
      await loadMessages();
    }
    checkLoginAndLoad();
  }, []);

  async function send() {
    if (!text.trim()) return;
    const res = await fetch("/api/client/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data?.message || "Failed to send message.");
      return;
    }
    setText("");
    setStatus("");
    await loadMessages();
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <ClientSidebar />
      <main className="flex-1 p-8">
        {moduleEnabled === false ? (
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-blue-950">Module Disabled</h2>
            <p className="mt-2 text-slate-600">Module not enabled by consultant.</p>
          </div>
        ) : (
          <>
        <h1 className="text-2xl font-bold text-blue-950">DC Connect</h1>
        <p className="mt-1 text-slate-600">Send your questions and receive replies from admin.</p>

        <div className="mt-6 rounded-2xl bg-white p-4 text-slate-900 shadow">
          <div className="h-[420px] overflow-y-auto rounded-xl border p-3">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-500">No messages yet.</p>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                      message.sender === "client"
                        ? "ml-auto bg-yellow-100 text-slate-900"
                        : "bg-slate-200 text-slate-900"
                    }`}
                  >
                    <p>{message.text}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(message.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 rounded-xl border bg-white px-4 py-3 text-slate-900"
            />
            <button
              onClick={send}
              className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800"
            >
              Send
            </button>
          </div>
          {status && <p className="mt-2 text-sm font-semibold text-red-600">{status}</p>}
        </div>
          </>
        )}
      </main>
    </div>
  );
}
