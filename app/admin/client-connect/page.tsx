"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Thread = {
  client: { id: string; name: string; email: string };
  lastMessage: { text: string; createdAt: string } | null;
  messageCount: number;
};

type Message = {
  id: string;
  sender: "client" | "admin";
  text: string;
  createdAt: string;
};

export default function AdminClientConnectPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");

  async function loadThreads() {
    const res = await fetch("/api/admin/client-connect", { cache: "no-store" });
    const data = await res.json();
    const payload = data?.data ?? data;
    const nextThreads: Thread[] = payload.threads || [];
    setThreads(nextThreads);
    if (!selectedClientId && nextThreads.length > 0) {
      setSelectedClientId(nextThreads[0].client.id);
    }
  }

  async function loadMessages(clientId: string) {
    const res = await fetch(`/api/admin/client-connect?clientId=${clientId}`, {
      cache: "no-store",
    });
    const data = await res.json();
    const payload = data?.data ?? data;
    setMessages(payload.messages || []);
  }

  useEffect(() => {
    async function checkLoginAndLoad() {
      const me = await fetch("/api/admin/me");
      const meData = await me.json();
      const loggedIn = meData?.data?.loggedIn ?? meData?.loggedIn ?? false;
      if (!loggedIn) {
        window.location.href = "/signin";
        return;
      }
      await loadThreads();
    }
    checkLoginAndLoad();
  }, []);

  useEffect(() => {
    if (!selectedClientId) return;
    loadMessages(selectedClientId);
  }, [selectedClientId]);

  async function sendReply() {
    if (!selectedClientId || !text.trim()) return;
    const res = await fetch("/api/admin/client-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: selectedClientId, text }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data?.message || "Failed to send reply.");
      return;
    }
    setText("");
    setStatus("");
    await loadMessages(selectedClientId);
    await loadThreads();
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-extrabold text-blue-950">DC Connect</h1>
        <p className="mt-1 text-slate-600">
          View client chats and respond like a messenger conversation.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-[320px_1fr]">
          <section className="rounded-2xl bg-white p-3 text-slate-900 shadow">
            <h2 className="px-2 text-sm font-bold text-slate-700">Chats</h2>
            <div className="mt-2 space-y-2">
              {threads.length === 0 ? (
                <p className="px-2 text-sm text-slate-500">No client chats yet.</p>
              ) : (
                threads.map((thread) => (
                  <button
                    key={thread.client.id}
                    onClick={() => setSelectedClientId(thread.client.id)}
                    className={`w-full rounded-xl px-3 py-2 text-left ${
                      selectedClientId === thread.client.id
                        ? "bg-yellow-100"
                        : "bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <p className="font-semibold text-blue-950">{thread.client.name}</p>
                    <p className="text-xs text-slate-500">{thread.client.email}</p>
                    <p className="mt-1 text-xs text-slate-600 line-clamp-1">
                      {thread.lastMessage?.text || "No messages"}
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-4 text-slate-900 shadow">
            <div className="h-[460px] overflow-y-auto rounded-xl border p-3">
              {!selectedClientId ? (
                <p className="text-sm text-slate-500">Select a client thread.</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-slate-500">No messages yet.</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                        message.sender === "admin"
                          ? "ml-auto bg-blue-900 text-white"
                          : "bg-slate-200 text-slate-900"
                      }`}
                    >
                      <p>{message.text}</p>
                      <p
                        className={`mt-1 text-xs ${
                          message.sender === "admin" ? "text-white/70" : "text-slate-500"
                        }`}
                      >
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
                placeholder="Type reply..."
                className="flex-1 rounded-xl border bg-white px-4 py-3 text-slate-900"
              />
              <button
                onClick={sendReply}
                disabled={!selectedClientId}
                className="rounded-xl bg-yellow-500 px-5 py-3 font-semibold text-blue-950 hover:bg-yellow-400 disabled:opacity-50"
              >
                Send
              </button>
            </div>
            {status && <p className="mt-2 text-sm font-semibold text-red-600">{status}</p>}
          </section>
        </div>
      </main>
    </div>
  );
}
