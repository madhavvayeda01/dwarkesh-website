export const NOTIFICATION_FILTERS = ["all", "unread", "chat", "compliance", "audit"] as const;

export type NotificationFilter = (typeof NOTIFICATION_FILTERS)[number];
export type NotificationCategory = "chat" | "compliance" | "audit";

export type NotificationFeedItem = {
  id: string;
  category: NotificationCategory;
  sourceId: string;
  createdAt: string;
  unread: boolean;
  title: string;
  body: string;
  href: string;
  actionLabel: string;
  accent: "blue" | "amber" | "emerald" | "rose";
  meta: string;
  client: {
    id: string;
    name: string;
  } | null;
  unreadCount?: number;
};

export type NotificationSummaryPayload = {
  unreadCount: number;
  latestAt: string | null;
  items: NotificationFeedItem[];
};

export type NotificationFeedPayload = NotificationSummaryPayload & {
  nextCursor: string | null;
};

export type MarkNotificationReadPayload =
  | {
      category: "chat";
      clientId: string;
    }
  | {
      category: "compliance" | "audit";
      sourceId: string;
    };
