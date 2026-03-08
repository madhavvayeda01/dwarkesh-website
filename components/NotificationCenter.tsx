"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  MarkNotificationReadPayload,
  NotificationFeedItem,
  NotificationFeedPayload,
  NotificationFilter,
} from "@/lib/notification-shared";

type NotificationCenterProps = {
  role: "admin" | "client";
};

const FILTERS: Array<{ key: NotificationFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "chat", label: "Chat" },
  { key: "compliance", label: "Compliance" },
  { key: "audit", label: "Audit" },
];

function readJsonSafe<T>(text: string): T | null {
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
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

function getAccentClasses(accent: NotificationFeedItem["accent"], unread: boolean) {
  switch (accent) {
    case "amber":
      return unread
        ? "border-amber-300/70 bg-amber-50 text-amber-950 dark:border-amber-400/50 dark:bg-amber-950/25 dark:text-amber-100"
        : "border-amber-200/60 bg-white text-slate-900 dark:border-amber-500/20 dark:bg-slate-950/80 dark:text-slate-100";
    case "emerald":
      return unread
        ? "border-emerald-300/70 bg-emerald-50 text-emerald-950 dark:border-emerald-400/50 dark:bg-emerald-950/25 dark:text-emerald-100"
        : "border-emerald-200/60 bg-white text-slate-900 dark:border-emerald-500/20 dark:bg-slate-950/80 dark:text-slate-100";
    case "rose":
      return unread
        ? "border-rose-300/70 bg-rose-50 text-rose-950 dark:border-rose-400/50 dark:bg-rose-950/25 dark:text-rose-100"
        : "border-rose-200/60 bg-white text-slate-900 dark:border-rose-500/20 dark:bg-slate-950/80 dark:text-slate-100";
    default:
      return unread
        ? "border-blue-300/70 bg-blue-50 text-blue-950 dark:border-blue-400/50 dark:bg-blue-950/25 dark:text-blue-100"
        : "border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100";
  }
}

function filterList(role: NotificationCenterProps["role"]) {
  return role === "admin" ? FILTERS : FILTERS.filter((item) => item.key !== "audit");
}

export default function NotificationCenter({ role }: NotificationCenterProps) {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [items, setItems] = useState<NotificationFeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestAt, setLatestAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const endpointBase = role === "admin" ? "/api/admin/notifications" : "/api/client/notifications";
  const visibleFilters = useMemo(() => filterList(role), [role]);

  const loadFeed = useCallback(async (options?: { cursor?: string | null; append?: boolean }) => {
    const isAppend = options?.append || false;
    if (isAppend) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("filter", filter);
      params.set("limit", "12");
      if (options?.cursor) {
        params.set("cursor", options.cursor);
      }

      const res = await fetch(`${endpointBase}/feed?${params.toString()}`, { cache: "no-store" });
      const text = await res.text();
      const data = readJsonSafe<{ data?: NotificationFeedPayload }>(text);
      const payload = data?.data;

      if (!res.ok || !payload) {
        throw new Error("Failed to load notifications.");
      }

      setUnreadCount(payload.unreadCount || 0);
      setLatestAt(payload.latestAt || null);
      setNextCursor(payload.nextCursor || null);
      setItems((current) => (isAppend ? [...current, ...payload.items] : payload.items));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load notifications.";
      setError(message);
      if (!isAppend) {
        setItems([]);
        setNextCursor(null);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [endpointBase, filter]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

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
    if (!item.unread) return;

    setBusyItemId(item.id);
    const payload: MarkNotificationReadPayload =
      item.category === "chat"
        ? { category: "chat", clientId: item.sourceId }
        : { category: item.category, sourceId: item.sourceId };

    try {
      await postJson(`${endpointBase}/read`, payload);
      setItems((current) => {
        const next = current.map((entry) =>
          entry.id === item.id ? { ...entry, unread: false, unreadCount: 0 } : entry
        );
        return filter === "unread" ? next.filter((entry) => entry.unread) : next;
      });
      setUnreadCount((current) =>
        Math.max(0, current - (item.category === "chat" ? item.unreadCount || 1 : 1))
      );
    } finally {
      setBusyItemId(null);
    }
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await postJson(`${endpointBase}/read-all`);
      setItems((current) =>
        filter === "unread"
          ? []
          : current.map((item) => ({ ...item, unread: false, unreadCount: 0 }))
      );
      setUnreadCount(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to mark notifications read.";
      setError(message);
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
      window.location.assign(item.href);
    }
  }

  const latestLabel = latestAt
    ? new Date(latestAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "No recent activity";

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400 dark:text-slate-500">
              Notification Center
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Notifications
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              Unified feed for chat, compliance reminders, and audit follow-ups. The header bell
              now polls a lightweight summary, while this page loads the detailed feed on demand.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void loadFeed()}
              className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={markAllRead}
              disabled={markingAll || unreadCount === 0}
              className="rounded-2xl bg-blue-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {markingAll ? "Marking..." : "Mark all read"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              Unread
            </p>
            <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{unreadCount}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              Active filter
            </p>
            <p className="mt-2 text-xl font-black capitalize text-slate-900 dark:text-white">
              {filter === "all" ? "Everything" : filter}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              Latest update
            </p>
            <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{latestLabel}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex flex-wrap items-center gap-2">
          {visibleFilters.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                filter === item.key
                  ? "bg-blue-900 text-white shadow-[0_10px_24px_rgba(30,64,175,0.25)]"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-[24px] border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
              <p className="text-lg font-bold text-slate-900 dark:text-white">No notifications here</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {filter === "unread"
                  ? "Everything is read right now."
                  : "New chat, compliance, and audit activity will appear here."}
              </p>
            </div>
          ) : (
            items.map((item) => (
              <article
                key={item.id}
                className={`rounded-[26px] border p-5 transition ${getAccentClasses(
                  item.accent,
                  item.unread
                )}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.22em] dark:bg-white/10">
                        {item.category}
                      </span>
                      {item.unread && (
                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-current" aria-hidden="true" />
                      )}
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                        {item.meta}
                      </span>
                    </div>
                    <h2 className="mt-3 text-xl font-black tracking-tight">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 opacity-90">{item.body}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                      {item.client?.name && <span>{item.client.name}</span>}
                      <span>{formatRelativeTime(item.createdAt)}</span>
                      {item.unreadCount && item.unreadCount > 1 && (
                        <span>{item.unreadCount} unread</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void openItem(item)}
                      className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                    >
                      {item.actionLabel}
                    </button>
                    {item.unread && (
                      <button
                        type="button"
                        onClick={() => void markItemRead(item)}
                        disabled={busyItemId === item.id}
                        className="rounded-2xl border border-current px-4 py-2.5 text-sm font-bold transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/10"
                      >
                        {busyItemId === item.id ? "Saving..." : "Mark read"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        {nextCursor && !loading && (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => void loadFeed({ cursor: nextCursor, append: true })}
              disabled={loadingMore}
              className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
