"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  MarkNotificationReadPayload,
  NotificationFeedItem,
  NotificationSummaryPayload,
} from "@/lib/notification-shared";

type Role = "admin" | "client";

const POLL_INTERVAL_MS = 30000;

async function readJsonSafe<T>(res: Response) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function playNotificationBeep() {
  try {
    const audioCtx = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
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
    // Ignore sound restrictions and continue without audio.
  }
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = date.getTime() - Date.now();
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const minutes = Math.round(diffMs / (60 * 1000));
  const hours = Math.round(diffMs / (60 * 60 * 1000));
  const days = Math.round(diffMs / (24 * 60 * 60 * 1000));

  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(days, "day");
}

function categoryLabel(item: NotificationFeedItem) {
  if (item.category === "chat") return "Chat";
  if (item.category === "audit") return "Audit";
  return "Compliance";
}

export default function NotificationBell() {
  const [role, setRole] = useState<Role | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [summary, setSummary] = useState<NotificationSummaryPayload>({
    unreadCount: 0,
    latestAt: null,
    items: [],
  });
  const prevUnreadRef = useRef(0);
  const initializedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const endpointBase = useMemo(() => {
    if (role === "admin") return "/api/admin/notifications";
    if (role === "client") return "/api/client/notifications";
    return null;
  }, [role]);

  const notificationsHref = role === "admin" ? "/admin/notifications" : "/client/notifications";

  const resolveRole = useCallback(async () => {
    try {
      const [adminRes, clientRes] = await Promise.all([
        fetch("/api/admin/me", { cache: "no-store" }),
        fetch("/api/client/me", { cache: "no-store" }),
      ]);
      const [adminData, clientData] = await Promise.all([
        readJsonSafe<{ data?: { loggedIn?: boolean } }>(adminRes),
        readJsonSafe<{ data?: { loggedIn?: boolean } }>(clientRes),
      ]);
      const adminLoggedIn = adminData?.data?.loggedIn ?? false;
      const clientLoggedIn = clientData?.data?.loggedIn ?? false;

      if (adminLoggedIn) {
        setRole("admin");
        return;
      }

      if (clientLoggedIn) {
        setRole("client");
        return;
      }
    } catch {
      // Ignore role lookup failures and keep the bell hidden.
    }

    setRole(null);
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!endpointBase) return;
    if (document.visibilityState !== "visible") return;

    setLoading(true);
    try {
      const res = await fetch(endpointBase, { cache: "no-store" });
      const data = await readJsonSafe<{ data?: NotificationSummaryPayload }>(res);
      const payload = data?.data || { unreadCount: 0, latestAt: null, items: [] };

      setSummary(payload);

      if (initializedRef.current && payload.unreadCount > prevUnreadRef.current) {
        playNotificationBeep();
      }
      prevUnreadRef.current = payload.unreadCount || 0;
      initializedRef.current = true;
    } catch {
      setSummary({ unreadCount: 0, latestAt: null, items: [] });
      prevUnreadRef.current = 0;
    } finally {
      setLoading(false);
    }
  }, [endpointBase]);

  async function postJson(path: string, payload?: object) {
    const res = await fetch(path, {
      method: "POST",
      headers: payload ? { "Content-Type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    });
    if (!res.ok) {
      throw new Error("Notification update failed.");
    }
  }

  async function markItemRead(item: NotificationFeedItem) {
    if (!endpointBase || !item.unread) return;

    const payload: MarkNotificationReadPayload =
      item.category === "chat"
        ? { category: "chat", clientId: item.sourceId }
        : { category: item.category, sourceId: item.sourceId };

    setBusyItemId(item.id);
    try {
      await postJson(`${endpointBase}/read`, payload);
      setSummary((current) => ({
        ...current,
        unreadCount: Math.max(
          0,
          current.unreadCount - (item.category === "chat" ? item.unreadCount || 1 : 1)
        ),
        items: current.items.map((entry) =>
          entry.id === item.id ? { ...entry, unread: false, unreadCount: 0 } : entry
        ),
      }));
    } finally {
      setBusyItemId(null);
    }
  }

  async function markAllRead() {
    if (!endpointBase) return;

    setMarkingAll(true);
    try {
      await postJson(`${endpointBase}/read-all`);
      setSummary((current) => ({
        ...current,
        unreadCount: 0,
        items: current.items.map((item) => ({ ...item, unread: false, unreadCount: 0 })),
      }));
      prevUnreadRef.current = 0;
    } finally {
      setMarkingAll(false);
    }
  }

  async function openItem(item: NotificationFeedItem) {
    try {
      if (item.unread) {
        await markItemRead(item);
      }
    } finally {
      setOpen(false);
      window.location.assign(item.href);
    }
  }

  useEffect(() => {
    void resolveRole();
  }, [resolveRole]);

  useEffect(() => {
    if (!endpointBase) return;
    void loadNotifications();

    const timer = window.setInterval(() => {
      void loadNotifications();
    }, POLL_INTERVAL_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void loadNotifications();
      }
    }

    window.addEventListener("focus", handleVisibilityChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleVisibilityChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [endpointBase, loadNotifications]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  if (!role) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="app-header-control app-header-control--icon relative"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          if (!open) {
            void loadNotifications();
          }
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="app-header-control__icon"
          aria-hidden="true"
        >
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M9 17a3 3 0 0 0 6 0" />
        </svg>

        {summary.unreadCount > 0 && (
          <span className="app-header-control__badge absolute -right-1.5 -top-1.5">
            {summary.unreadCount > 99 ? "99+" : summary.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="app-header-popover absolute right-0 z-50 mt-3 w-[24rem] p-0 text-sm text-slate-900 opacity-100">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="app-header-popover__title">Notifications</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  {summary.unreadCount > 0
                    ? `${summary.unreadCount} unread`
                    : summary.latestAt
                    ? `Last updated ${formatRelativeTime(summary.latestAt)}`
                    : "No recent activity"}
                </p>
              </div>
              <button
                type="button"
                onClick={markAllRead}
                disabled={markingAll || summary.unreadCount === 0}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                {markingAll ? "Marking..." : "Mark all"}
              </button>
            </div>
          </div>

          <div className="max-h-[26rem] overflow-y-auto px-3 py-3">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900"
                  />
                ))}
              </div>
            ) : summary.items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-900">
                <p className="font-bold text-slate-900 dark:text-white">No notifications</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  New chat, compliance, and audit activity will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {summary.items.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl border px-4 py-3 transition ${
                      item.unread
                        ? "border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-950/25"
                        : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => void openItem(item)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white dark:bg-white dark:text-slate-950">
                            {categoryLabel(item)}
                          </span>
                          {item.unread && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-blue-600" />
                          )}
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 truncate text-sm font-bold text-slate-900 dark:text-white">
                          {item.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                          {item.body}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                          {item.client?.name && <span>{item.client.name}</span>}
                          <span>{item.meta}</span>
                          {item.unreadCount && item.unreadCount > 1 && (
                            <span>{item.unreadCount} unread</span>
                          )}
                        </div>
                      </button>

                      {item.unread && (
                        <button
                          type="button"
                          onClick={() => void markItemRead(item)}
                          disabled={busyItemId === item.id}
                          className="shrink-0 rounded-full border border-slate-300 px-2.5 py-1 text-[11px] font-bold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                        >
                          {busyItemId === item.id ? "..." : "Read"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                window.location.assign(notificationsHref);
              }}
              className="w-full rounded-2xl bg-blue-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
            >
              Open notification center
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
