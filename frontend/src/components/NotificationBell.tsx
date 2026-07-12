import {
  Bell,
  CheckCheck,
  ExternalLink,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/axios";
import { useAppSelector } from "../app/hooks";
import { subscribeOrderSocket } from "../utils/orderSocket";

type NotificationItem = {
  _id: string;
  userId: string | null;
  role: "user" | "admin" | "staff";
  title: string;
  message: string;
  type: string;
  link: string;
  metadata: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

type NotificationsResponse = {
  success: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
};

type NotificationSocketPayload = {
  type: "NOTIFICATION_CREATED";
  notification: NotificationItem;
  unreadDelta: number;
};

type NotificationFilter = "all" | "unread" | "read";

type NotificationBellProps = {
  accent?: "orange" | "teal";
};

const filterOptions: NotificationFilter[] = ["all", "unread", "read"];

const accentClasses = {
  orange: {
    button:
      "text-stone-700 hover:bg-orange-50 hover:text-orange-700 focus:ring-orange-100",
    badge: "bg-orange-700 text-white",
    activeTab: "bg-orange-700 text-white",
    link: "text-orange-700",
  },
  teal: {
    button:
      "text-slate-700 hover:bg-teal-50 hover:text-teal-700 focus:ring-teal-100",
    badge: "bg-teal-700 text-white",
    activeTab: "bg-teal-700 text-white",
    link: "text-teal-700",
  },
};

const isNotificationPayload = (
  payload: unknown
): payload is NotificationSocketPayload => {
  if (!payload || typeof payload !== "object") return false;

  return (
    (payload as Partial<NotificationSocketPayload>).type ===
      "NOTIFICATION_CREATED" &&
    Boolean((payload as Partial<NotificationSocketPayload>).notification)
  );
};

const formatTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
};

function NotificationBell({ accent = "orange" }: NotificationBellProps) {
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.auth.currentUser);
  const styles = accentClasses[accent];
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [pushMessage, setPushMessage] = useState("");
  const [pushBusy, setPushBusy] = useState(false);

  const loadNotifications = useCallback(
    async (nextPage = 1, nextFilter = filter, append = false) => {
      if (!currentUser) return;

      setLoading(true);

      try {
        const response = await api.get<NotificationsResponse>(
          "/notifications",
          {
            params: {
              page: nextPage,
              limit: 10,
              status: nextFilter,
            },
          }
        );

        setNotifications((current) =>
          append
            ? [...current, ...response.data.notifications]
            : response.data.notifications
        );
        setUnreadCount(response.data.unreadCount || 0);
        setPage(response.data.pagination.page);
        setHasMore(response.data.pagination.hasMore);
      } finally {
        setLoading(false);
      }
    },
    [currentUser, filter]
  );

  useEffect(() => {
    if (!currentUser) return;

    void loadNotifications(1, filter, false);
  }, [currentUser, filter, loadNotifications]);

  useEffect(() => {
    if (!currentUser) return undefined;

    return subscribeOrderSocket((payload) => {
      if (!isNotificationPayload(payload)) return;

      setUnreadCount((count) =>
        Math.max(count + (payload.unreadDelta || 0), 0)
      );

      setNotifications((current) => {
        if (filter === "read") return current;
        if (current.some((item) => item._id === payload.notification._id)) {
          return current;
        }

        return [payload.notification, ...current].slice(0, 30);
      });
    });
  }, [currentUser, filter]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  const visibleUnreadCount = useMemo(
    () => (unreadCount > 99 ? "99+" : String(unreadCount)),
    [unreadCount]
  );

  const handleMarkRead = async (notification: NotificationItem) => {
    if (notification.isRead) return;

    await api.patch(`/notifications/${notification._id}/read`);
    setNotifications((current) =>
      current.map((item) =>
        item._id === notification._id
          ? { ...item, isRead: true, readAt: new Date().toISOString() }
          : item
      )
    );
    setUnreadCount((count) => Math.max(count - 1, 0));
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    await handleMarkRead(notification);

    if (notification.link) {
      setOpen(false);
      navigate(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    if (markingAll) return;

    setMarkingAll(true);

    try {
      await api.patch("/notifications/read-all");
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          isRead: true,
          readAt: item.readAt || new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
    } finally {
      setMarkingAll(false);
    }
  };

  const enableBrowserPush = async () => {
    setPushMessage("");

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushMessage("Browser push is not supported here.");
      return;
    }

    setPushBusy(true);

    try {
      const permission = await window.Notification.requestPermission();

      if (permission !== "granted") {
        setPushMessage("Notification permission was not granted.");
        return;
      }

      const keyResponse = await api.get<{
        publicKey: string;
        configured: boolean;
      }>("/notifications/push-public-key");

      if (!keyResponse.data.configured || !keyResponse.data.publicKey) {
        setPushMessage("Browser push is not configured on the server.");
        return;
      }

      const registration = await navigator.serviceWorker.register(
        "/notification-sw.js"
      );
      const existingSubscription =
        await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            keyResponse.data.publicKey
          ),
        }));

      await api.post("/notifications/push-subscriptions", {
        subscription: subscription.toJSON(),
      });

      setPushMessage("Browser push notifications are enabled.");
    } catch {
      setPushMessage("Unable to enable browser push notifications.");
    } finally {
      setPushBusy(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Notifications"
        className={[
          "relative flex size-10 items-center justify-center rounded-full transition focus:outline-none focus:ring-2",
          styles.button,
        ].join(" ")}
      >
        <Bell size={19} strokeWidth={2.4} />
        {unreadCount > 0 ? (
          <span
            className={[
              "absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black leading-5",
              styles.badge,
            ].join(" ")}
          >
            {visibleUnreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <section className="absolute right-0 top-12 z-50 w-[min(92vw,420px)] overflow-hidden rounded-lg border border-stone-200 bg-white text-stone-950 shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
            <div>
              <h2 className="text-base font-black">Notifications</h2>
              <p className="text-xs font-semibold text-stone-500">
                {unreadCount} unread
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll || unreadCount === 0}
                className="flex size-9 items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                title="Mark all as read"
              >
                {markingAll ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <CheckCheck size={17} />
                )}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-9 items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-100"
                title="Close"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          <div className="border-b border-stone-100 px-4 py-3">
            <div className="flex gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={[
                    "h-8 rounded-full px-3 text-xs font-black capitalize transition",
                    filter === option
                      ? styles.activeTab
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200",
                  ].join(" ")}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center px-4 py-10 text-sm font-bold text-stone-500">
                <Loader2 size={17} className="mr-2 animate-spin" />
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm font-bold text-stone-500">
                No notifications found.
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification._id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={[
                    "block w-full border-b border-stone-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-stone-50",
                    notification.isRead ? "bg-white" : "bg-orange-50/50",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-stone-950">
                        {notification.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-stone-600">
                        {notification.message}
                      </p>
                    </div>
                    {!notification.isRead ? (
                      <span className="mt-1 size-2 shrink-0 rounded-full bg-orange-700" />
                    ) : null}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold uppercase text-stone-400">
                      {formatTime(notification.createdAt)}
                    </span>
                    {notification.link ? (
                      <span
                        className={[
                          "inline-flex items-center gap-1 text-[11px] font-black",
                          styles.link,
                        ].join(" ")}
                      >
                        Open
                        <ExternalLink size={12} />
                      </span>
                    ) : null}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-stone-100 px-4 py-3">
            {hasMore ? (
              <button
                type="button"
                onClick={() => loadNotifications(page + 1, filter, true)}
                disabled={loading}
                className="mb-3 flex h-9 w-full items-center justify-center rounded-lg bg-stone-100 text-xs font-black text-stone-700 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Loading..." : "Load more"}
              </button>
            ) : null}

            <button
              type="button"
              onClick={enableBrowserPush}
              disabled={pushBusy}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white text-xs font-black text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pushBusy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <ShieldCheck size={15} />
              )}
              Enable Browser Alerts
            </button>
            {pushMessage ? (
              <p className="mt-2 text-center text-xs font-semibold text-stone-500">
                {pushMessage}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default NotificationBell;
