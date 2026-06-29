import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, RefreshCw, Utensils } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/axios";
import Navbar from "../components/Navbar";

type AuthUser = {
  id: string;
};

type MenuItem = {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
};

type OrderItem = {
  menuItemId: string | MenuItem;
  quantity: number;
  price: number;
};

type Order = {
  _id: string;
  items: OrderItem[];
  orderType: "DINE_IN" | "TAKEAWAY";
  totalAmount: number;
  orderStatus:
    | "PENDING"
    | "CONFIRMED"
    | "PREPARING"
    | "READY"
    | "COMPLETED"
    | "CANCELLED";
  paymentStatus: "PENDING" | "PAID";
  createdAt: string;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=240&h=240&fit=crop&q=80";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));

const getMenuId = (item: OrderItem) =>
  typeof item.menuItemId === "string" ? item.menuItemId : item.menuItemId._id;

const getApiMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  return fallback;
};

const statusClass: Record<Order["orderStatus"], string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PREPARING: "bg-orange-100 text-orange-700",
  READY: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

function OrderCard({
  order,
  menuById,
  onReorder,
  reordering,
}: {
  order: Order;
  menuById: Map<string, MenuItem>;
  onReorder: (order: Order) => void;
  reordering: boolean;
}) {
  return (
    <article className="rounded-lg border border-orange-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-stone-950">
            #Z-{order._id.slice(-5).toUpperCase()}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {formatDate(order.createdAt)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase ${statusClass[order.orderStatus]}`}
        >
          {order.orderStatus}
        </span>
      </div>

      <div className="mt-4 space-y-3 border-b border-orange-50 pb-4">
        {order.items.map((item, index) => {
          const menuItem = menuById.get(getMenuId(item));
          return (
            <div
              key={`${getMenuId(item)}-${index}`}
              className="grid grid-cols-[3rem_1fr_auto] items-center gap-3"
            >
              <img
                src={menuItem?.image || fallbackImage}
                alt={menuItem?.name || "Menu item"}
                className="h-12 w-12 rounded-md object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-900">
                  {item.quantity}x {menuItem?.name || "Menu item"}
                </p>
                <p className="mt-1 truncate text-xs text-stone-500">
                  {menuItem?.category || order.orderType.replace("_", " ")}
                </p>
              </div>
              <p className="text-sm font-semibold text-stone-700">
                {formatCurrency(item.price * item.quantity)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-stone-500">Total Amount</p>
          <p className="text-xl font-extrabold text-orange-700">
            {formatCurrency(order.totalAmount)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onReorder(order)}
          disabled={reordering || order.orderStatus === "CANCELLED"}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-orange-700 px-5 text-sm font-bold text-white transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:border disabled:border-orange-200 disabled:bg-white disabled:text-orange-700"
        >
          {reordering ? <Loader2 size={15} className="animate-spin" /> : null}
          {order.orderStatus === "CANCELLED" ? "Retry" : "Reorder"}
        </button>
      </div>
    </article>
  );
}

const History = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reorderingId, setReorderingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [meResponse, orderResponse, menuResponse] = await Promise.all([
          api.get<{ user: AuthUser }>("/auth/me"),
          api.get<{ data: Order[] }>("/orders/my-orders"),
          api.get<{ menus: MenuItem[] }>("/menu"),
        ]);

        if (!mounted) return;

        setUser(meResponse.data.user);
        setOrders(orderResponse.data.data);
        setMenus(menuResponse.data.menus);
      } catch (loadError) {
        if (mounted) {
          setError(
            getApiMessage(
              loadError,
              "Unable to load order history. Please check that order and menu routes are running."
            )
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const menuById = useMemo(
    () => new Map(menus.map((item) => [item._id, item])),
    [menus]
  );

  const handleReorder = async (order: Order) => {
    if (!user) return;

    setReorderingId(order._id);
    setError("");

    try {
      for (const item of order.items) {
        for (let count = 0; count < item.quantity; count += 1) {
          await api.post("/cart", {
            userId: user.id,
            menuItemId: getMenuId(item),
          });
        }
      }
      navigate("/checkout");
    } catch (reorderError) {
      setError(getApiMessage(reorderError, "Unable to reorder this order."));
    } finally {
      setReorderingId("");
    }
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-orange-50/60 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-stone-950">
                Order History
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                Your delicious memories, recorded.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              aria-label="Refresh orders"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-orange-700 shadow-sm"
            >
              <RefreshCw size={18} />
            </button>
          </div>

          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[420px] items-center justify-center text-stone-500">
              <Loader2 className="mr-2 animate-spin" size={20} />
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-lg border border-orange-100 bg-white p-8 text-center shadow-sm">
              <Utensils className="mx-auto text-orange-700" size={36} />
              <p className="mt-4 text-lg font-extrabold text-stone-950">
                No orders yet
              </p>
              <Link
                to="/menu"
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-orange-700 px-5 text-sm font-bold text-white"
              >
                View Menu <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="space-y-4 pb-6">
              {orders.map((order) => (
                <OrderCard
                  key={order._id}
                  order={order}
                  menuById={menuById}
                  onReorder={handleReorder}
                  reordering={reorderingId === order._id}
                />
              ))}

              <section className="mt-4 rounded-lg bg-orange-700 p-6 text-white">
                <h2 className="text-xl font-extrabold">
                  Feeling Hungry Again?
                </h2>
                <p className="mt-2 text-sm font-medium text-orange-50">
                  Your favorites are just one tap away.
                </p>
                <Link
                  to="/menu"
                  className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-bold text-orange-700"
                >
                  View Menu <ArrowRight size={16} />
                </Link>
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default History;
