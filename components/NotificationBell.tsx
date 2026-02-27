"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Role = "admin" | "client";

type NotificationPayload = {
  unreadCount: number;
  latestAt: string | null;
};

const POLL_INTERVAL_MS = 8000;

function playNotificationBeep() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.18);

    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.2);
  } catch {
    // Ignore sound errors (autoplay/user gesture restrictions).
  }
}

export default function NotificationBell() {
  const [role, setRole] = useState<Role | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestAt, setLatestAt] = useState<string | null>(null);
  const prevUnreadRef = useRef(0);
  const initializedRef = useRef(false);

  const endpoint = useMemo(() => {
    if (role === "admin") return "/api/admin/notifications";
    if (role === "client") return "/api/client/notifications";
    return null;
  }, [role]);

  const storageKey = useMemo(() => {
    if (!role) return null;
    return `notify_last_seen_${role}`;
  }, [role]);

  async function resolveRole() {
    const [adminRes, clientRes] = await Promise.all([
      fetch("/api/admin/me", { cache: "no-store" }),
      fetch("/api/client/me", { cache: "no-store" }),
    ]);
    const adminData = await adminRes.json();
    const clientData = await clientRes.json();
    const adminLoggedIn = adminData?.data?.loggedIn ?? adminData?.loggedIn ?? false;
    const clientLoggedIn = clientData?.data?.loggedIn ?? clientData?.loggedIn ?? false;

    if (adminLoggedIn) {
      setRole("admin");
      return;
    }
    if (clientLoggedIn) {
      setRole("client");
      return;
    }
    setRole(null);
  }

  async function loadNotifications() {
    if (!endpoint) return;
    const since = storageKey ? localStorage.getItem(storageKey) : null;
    const url = since ? `${endpoint}?since=${encodeURIComponent(since)}` : endpoint;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    const payload: NotificationPayload = (data?.data ?? data) || {
      unreadCount: 0,
      latestAt: null,
    };

    const nextUnread = payload.unreadCount || 0;
    setUnreadCount(nextUnread);
    setLatestAt(payload.latestAt || null);

    if (initializedRef.current && nextUnread > prevUnreadRef.current) {
      playNotificationBeep();
    }
    prevUnreadRef.current = nextUnread;
    initializedRef.current = true;
  }

  function markAllRead() {
    if (storageKey && latestAt) {
      localStorage.setItem(storageKey, latestAt);
    }
    setUnreadCount(0);
    prevUnreadRef.current = 0;
  }

  useEffect(() => {
    resolveRole();
  }, []);

  useEffect(() => {
    if (!endpoint) return;
    loadNotifications();
    const timer = window.setInterval(loadNotifications, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [endpoint, storageKey]);

  if (!role) return null;

  return (
    <div className="group relative">
      <button
        type="button"
        className="relative rounded-lg border border-white/15 bg-white/10 px-3 py-2 font-semibold text-white transition hover:bg-white/20"
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M9 17a3 3 0 0 0 6 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <div className="invisible absolute right-0 z-50 mt-2 w-64 rounded-xl bg-white p-3 text-sm text-slate-900 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
          <p className="font-bold text-blue-950">Notifications</p>
          {unreadCount > 0 ? (
            <p className="mt-2">{unreadCount} new message(s)</p>
          ) : (
            <p className="mt-2 text-slate-600">No new messages</p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={markAllRead}
              className="rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
            >
              Mark read
            </button>
            <a
              href={role === "admin" ? "/admin/client-connect" : "/client/chat"}
              className="rounded-lg bg-yellow-500 px-3 py-1.5 text-xs font-semibold text-blue-950 hover:bg-yellow-400"
            >
              Open chat
            </a>
          </div>
      </div>
    </div>
  );
}
