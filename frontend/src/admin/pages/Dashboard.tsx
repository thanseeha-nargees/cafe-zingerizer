import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  CircleCheck,
  Clock3,
  RefreshCw,
  ShieldX,
  ShoppingCart,
  Trophy,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { api } from "../../api/axios";
import { useOrderEvents } from "../../utils/useOrderEvents";

type RecentOrder = {
  _id: string;
  customerName: string;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt?: string;
  items?: Array<{
    quantity?: number;
  }>;
};

type OrderStatusSummary = {
  status: string;
  count: number;
};

type TopSellingItem = {
  _id: string;
  name: string;
  category?: string;
  quantitySold: number;
  revenue: number;
};

type DashboardData = {
  totalStaff: number;
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  todaysRevenue: number;
  todaysOrders: number;
  pendingOrders: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  orderStatusBreakdown: OrderStatusSummary[];
  topSellingItems: TopSellingItem[];
  recentOrders: RecentOrder[];
};

const emptyDashboard: DashboardData = {
  totalStaff: 0,
  totalUsers: 0,
  totalProducts: 0,
  totalOrders: 0,
  totalRevenue: 0,
  todaysRevenue: 0,
  todaysOrders: 0,
  pendingOrders: 0,
  activeOrders: 0,
  completedOrders: 0,
  cancelledOrders: 0,
  orderStatusBreakdown: [],
  topSellingItems: [],
  recentOrders: [],
};

const formatCount = (value: number) =>
  new Intl.NumberFormat("en-IN").format(value);

const formatCurrency = (value: number) =>
  `Rs ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value)}`;

const formatRelativeTime = (dateValue: string) => {
  const date = new Date(dateValue);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const orderStatusConfig = [
  { status: "PENDING", label: "Pending", color: "bg-amber-500" },
  { status: "CONFIRMED", label: "Confirmed", color: "bg-sky-500" },
  { status: "PREPARING", label: "Preparing", color: "bg-orange-500" },
  { status: "READY", label: "Ready", color: "bg-indigo-500" },
  { status: "COMPLETED", label: "Completed", color: "bg-emerald-500" },
  { status: "CANCELLED", label: "Cancelled", color: "bg-red-500" },
];

const DASHBOARD_REFRESH_EVENT = "admin:orders-updated";
const DASHBOARD_REFRESH_STORAGE_KEY = "admin:last-order-update";
const DASHBOARD_AUTO_REFRESH_MS = 10000;

function AdminDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);

  const loadDashboard = useCallback(async (showLoader = false) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    try {
      if (showLoader) {
        setLoading(true);
      }

      setError("");

      const response = await api.get("/admin/dashboard", {
        params: { _ts: Date.now() },
      });

      if (!mountedRef.current || requestId !== requestIdRef.current) return;

      setDashboard({
        ...emptyDashboard,
        ...response.data?.data,
        orderStatusBreakdown:
          response.data?.data?.orderStatusBreakdown || [],
        topSellingItems: response.data?.data?.topSellingItems || [],
        recentOrders: response.data?.data?.recentOrders || [],
      });
    } catch (requestError: any) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;

      setError(
        requestError.response?.data?.message ||
          "Failed to load dashboard data"
      );
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadDashboard(true);

    const refreshDashboard = () => {
      loadDashboard(false);
    };

    const refreshVisibleDashboard = () => {
      if (document.visibilityState === "visible") {
        loadDashboard(false);
      }
    };

    const refreshFromStorage = (event: StorageEvent) => {
      if (event.key === DASHBOARD_REFRESH_STORAGE_KEY) {
        loadDashboard(false);
      }
    };

    window.addEventListener(DASHBOARD_REFRESH_EVENT, refreshDashboard);
    window.addEventListener("focus", refreshDashboard);
    window.addEventListener("storage", refreshFromStorage);
    document.addEventListener("visibilitychange", refreshVisibleDashboard);
    const refreshTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadDashboard(false);
      }
    }, DASHBOARD_AUTO_REFRESH_MS);

    return () => {
      mountedRef.current = false;
      window.removeEventListener(DASHBOARD_REFRESH_EVENT, refreshDashboard);
      window.removeEventListener("focus", refreshDashboard);
      window.removeEventListener("storage", refreshFromStorage);
      document.removeEventListener("visibilitychange", refreshVisibleDashboard);
      window.clearInterval(refreshTimer);
    };
  }, [loadDashboard]);

  const handleOrderEvent = useCallback(() => {
    void loadDashboard(false);
  }, [loadDashboard]);

  useOrderEvents(handleOrderEvent);

  const stats = useMemo(
    () => [
      {
        label: "Total Orders",
        value: formatCount(dashboard.totalOrders),
        detail: `${formatCount(dashboard.todaysOrders)} orders today`,
        icon: ShoppingCart,
        featured: true,
      },
      {
        label: "Today's Revenue",
        value: formatCurrency(dashboard.todaysRevenue),
        detail: "Excluding cancelled orders today",
        icon: Banknote,
      },
      {
        label: "Completed",
        value: formatCount(dashboard.completedOrders),
        detail: "Finished orders",
        icon: CircleCheck,
      },
      {
        label: "Cancelled",
        value: formatCount(dashboard.cancelledOrders),
        detail: "Removed from revenue",
        icon: ShieldX,
      },
      {
        label: "Total Revenue",
        value: formatCurrency(dashboard.totalRevenue),
        detail: "Excluding cancelled orders",
        icon: Banknote,
      },
      {
        label: "Customers",
        value: formatCount(dashboard.totalUsers),
        detail: "Registered users",
        icon: UsersRound,
      },
      {
        label: "Staff",
        value: formatCount(dashboard.totalStaff),
        detail: `${formatCount(dashboard.totalProducts)} menu items`,
        icon: UserRoundCheck,
      },
    ],
    [dashboard]
  );

  const orderStatusCounts = useMemo(() => {
    const counts = new Map(
      dashboard.orderStatusBreakdown.map((item) => [item.status, item.count])
    );

    return orderStatusConfig.map((item) => ({
      ...item,
      count: counts.get(item.status) || 0,
    }));
  }, [dashboard.orderStatusBreakdown]);

  const orderStatusTotal = orderStatusCounts.reduce(
    (total, item) => total + item.count,
    0
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-wide text-orange-700">
            Database Overview
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Welcome back, Admin
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => loadDashboard(true)}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-orange-100 bg-white px-5 text-sm font-bold text-stone-800 shadow-sm transition hover:border-orange-200 hover:text-orange-800"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article
              key={stat.label}
              className={[
                "relative min-h-40 overflow-hidden rounded-2xl border p-6 shadow-sm",
                stat.featured
                  ? "border-orange-700 bg-orange-700 text-white shadow-orange-900/20"
                  : "border-orange-100 bg-[#fff1eb] text-stone-900",
              ].join(" ")}
            >
              <div
                className={[
                  "mb-6 flex size-11 items-center justify-center rounded-lg",
                  stat.featured
                    ? "bg-white/20 text-white"
                    : "bg-orange-100 text-orange-700",
                ].join(" ")}
              >
                <Icon size={22} strokeWidth={2.4} />
              </div>
              <p className="text-sm font-bold opacity-90">{stat.label}</p>
              <p className="mt-2 text-3xl font-black tracking-tight">
                {loading ? "..." : stat.value}
              </p>
              <p className="mt-3 text-xs font-extrabold opacity-90">
                {stat.detail}
              </p>

              <div className="pointer-events-none absolute -bottom-8 -right-4 opacity-10">
                <Icon size={118} strokeWidth={1.8} />
              </div>
            </article>
          );
        })}
      </section>

      <div className="mt-9 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">
              Top Selling Items
            </h2>
            <span className="flex size-10 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
              <Trophy size={21} strokeWidth={2.5} />
            </span>
          </div>

          <div className="space-y-3">
            {dashboard.topSellingItems.length > 0 ? (
              dashboard.topSellingItems.map((item, index) => (
                <div
                  key={item._id}
                  className="flex items-center gap-4 rounded-xl border border-orange-100 bg-[#fff8f4] p-4"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-orange-700 text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-extrabold text-stone-900">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-xs font-bold uppercase text-orange-700">
                      {item.category || "Menu item"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black text-stone-900">
                      {formatCount(item.quantitySold)} sold
                    </p>
                    <p className="mt-1 text-xs font-bold text-stone-500">
                      {formatCurrency(item.revenue)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-orange-200 bg-orange-50 p-4 text-sm font-bold text-stone-600">
                {loading ? "Loading items..." : "No item sales yet."}
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-orange-100 bg-[#fff1eb] p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">
              Order Status
            </h2>
            <span className="text-sm font-black text-orange-700">
              {formatCount(orderStatusTotal)}
            </span>
          </div>

          <div className="space-y-4">
            {orderStatusCounts.map((item) => {
              const percent = orderStatusTotal
                ? Math.round((item.count / orderStatusTotal) * 100)
                : 0;

              return (
                <div key={item.status}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-extrabold text-stone-800">
                      {item.label}
                    </span>
                    <span className="text-sm font-black text-stone-900">
                      {loading ? "..." : formatCount(item.count)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-orange-100 bg-[#fff1eb] p-6 shadow-sm">
        <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">
          Latest Order Activity
        </h2>
        <div className="mt-7 space-y-0">
          {dashboard.recentOrders.length > 0 ? (
            dashboard.recentOrders.map((order, index) => {
              const last = index === dashboard.recentOrders.length - 1;
              const completed = order.orderStatus === "COMPLETED";
              const cancelled = order.orderStatus === "CANCELLED";
              const Icon = completed
                ? CircleCheck
                : cancelled
                  ? Clock3
                  : ShoppingCart;
              const itemCount =
                order.items?.reduce(
                  (total, item) => total + (item.quantity || 0),
                  0
                ) || 0;

              return (
                <div key={order._id} className="relative flex gap-4 pb-7">
                  {!last ? (
                    <span className="absolute left-4 top-9 h-[calc(100%-2.25rem)] w-px bg-orange-200" />
                  ) : null}
                  <span
                    className={[
                      "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-1",
                      cancelled
                        ? "bg-red-50 text-red-600 ring-red-200"
                        : completed
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-orange-50 text-orange-700 ring-orange-200",
                    ].join(" ")}
                  >
                    <Icon size={15} strokeWidth={2.7} />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <h3 className="font-extrabold leading-tight text-stone-900">
                      Order #{order._id.slice(-6).toUpperCase()}
                    </h3>
                    <p className="mt-1 text-sm font-medium leading-snug text-stone-600">
                      {order.customerName} - {formatCurrency(order.totalAmount)}
                      {itemCount ? ` - ${itemCount} items` : ""}
                    </p>
                    <p className="mt-2 text-[11px] font-black uppercase text-orange-700">
                      {formatRelativeTime(order.updatedAt || order.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="rounded-lg border border-orange-100 bg-white/70 p-4 text-sm font-bold text-stone-600">
              {loading ? "Loading orders..." : "No orders found in database."}
            </p>
          )}
        </div>
        <button
          type="button"
          className="mt-1 h-11 w-full rounded-full border border-orange-200 bg-white text-sm font-extrabold text-stone-800 transition hover:border-orange-300 hover:text-orange-800"
        >
          View All Orders
        </button>
      </section>
    </div>
  );
}

export default AdminDashboard;
