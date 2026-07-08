import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  ShoppingBag,
  Utensils,
} from "lucide-react";
import { api } from "../../api/axios";

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

type OrderItem = {
  menuItemId?:
    | string
    | {
        _id: string;
        name?: string;
        category?: string;
        image?: string;
      };
  quantity?: number;
  price?: number;
};

type AdminOrder = {
  _id: string;
  customerName: string;
  customerPhone: string;
  orderType: "Dining" | "Takeaway";
  tableId?:
    | string
    | {
        _id: string;
        tableNumber?: number;
      }
    | null;
  items: OrderItem[];
  totalAmount: number;
  orderStatus: OrderStatus;
  paymentStatus: "PENDING" | "PAID";
  createdAt: string;
};

type FoodReadySmsResponse =
  | {
      status: "sent" | "already_sent";
      sentAt: string;
    }
  | {
      status: "failed";
      error: string;
    };

type UpdateOrderStatusResponse = {
  order: AdminOrder;
  message?: string;
  foodReadySms?: FoodReadySmsResponse | null;
};

type StatusFilter = OrderStatus | "all";

const orderStatuses: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
];

const statusClass: Record<OrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  CONFIRMED: "bg-sky-50 text-sky-700 ring-sky-200",
  PREPARING: "bg-orange-50 text-orange-700 ring-orange-200",
  READY: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 ring-red-200",
};

const terminalStatuses: OrderStatus[] = ["COMPLETED", "CANCELLED"];
const DASHBOARD_REFRESH_EVENT = "admin:orders-updated";
const DASHBOARD_REFRESH_STORAGE_KEY = "admin:last-order-update";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDate = (dateValue: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateValue));

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

const getItemName = (item: OrderItem) =>
  typeof item.menuItemId === "object" && item.menuItemId?.name
    ? item.menuItemId.name
    : "Menu item";

const getTableLabel = (order: AdminOrder) => {
  if (order.orderType === "Takeaway") return "Takeaway";

  if (typeof order.tableId === "object" && order.tableId?.tableNumber) {
    return `Table ${order.tableId.tableNumber}`;
  }

  return "Dining";
};

const getOrderLabel = (orderId: string) =>
  `Order #${orderId.slice(-6).toUpperCase()}`;

const getOrderUpdateNotice = (
  orderId: string,
  foodReadySms?: FoodReadySmsResponse | null
) => {
  const orderLabel = getOrderLabel(orderId);

  if (foodReadySms?.status === "sent") {
    return `${orderLabel} updated. SMS sent.`;
  }

  if (foodReadySms?.status === "already_sent") {
    return `${orderLabel} updated. SMS already sent.`;
  }

  return `${orderLabel} updated.`;
};

function OrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const loadOrders = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<{ orders: AdminOrder[] }>("/admin/orders");
      setOrders(response.data.orders || []);
    } catch (loadError) {
      setError(getApiMessage(loadError, "Failed to load orders"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    return orders.filter((order) => {
      const statusMatch =
        statusFilter === "all" || order.orderStatus === statusFilter;
      const itemNames = order.items.map(getItemName).join(" ").toLowerCase();
      const searchMatch =
        !term ||
        order.customerName.toLowerCase().includes(term) ||
        order.customerPhone.toLowerCase().includes(term) ||
        order._id.toLowerCase().includes(term) ||
        itemNames.includes(term);

      return statusMatch && searchMatch;
    });
  }, [orders, search, statusFilter]);

  const activeOrders = orders.filter(
    (order) => !terminalStatuses.includes(order.orderStatus)
  ).length;
  const completedOrders = orders.filter(
    (order) => order.orderStatus === "COMPLETED"
  ).length;
  const cancelledOrders = orders.filter(
    (order) => order.orderStatus === "CANCELLED"
  ).length;

  const handleStatusChange = async (
    order: AdminOrder,
    orderStatus: OrderStatus
  ) => {
    if (order.orderStatus === orderStatus) return;

    setSavingId(order._id);
    setError("");
    setNotice("");

    try {
      const response = await api.patch<UpdateOrderStatusResponse>(
        `/admin/orders/${order._id}/status`,
        { orderStatus }
      );

      setOrders((current) =>
        current.map((item) =>
          item._id === order._id ? response.data.order : item
        )
      );
      window.dispatchEvent(new Event(DASHBOARD_REFRESH_EVENT));

      try {
        localStorage.setItem(DASHBOARD_REFRESH_STORAGE_KEY, String(Date.now()));
      } catch {
      }

      setNotice(
        getOrderUpdateNotice(order._id, response.data.foodReadySms || null)
      );

      if (response.data.foodReadySms?.status === "failed") {
        setError(
          response.data.message ||
            response.data.foodReadySms.error ||
            "Order status updated, but SMS failed"
        );
      }
    } catch (saveError) {
      setError(getApiMessage(saveError, "Unable to update order status"));
    } finally {
      setSavingId("");
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-extrabold uppercase text-orange-700">
            Kitchen Queue
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-stone-900 sm:text-4xl">
            Orders
          </h1>
        </div>

        <button
          type="button"
          onClick={loadOrders}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-orange-100 bg-white px-4 text-sm font-bold text-stone-800 shadow-sm transition hover:border-orange-200 hover:text-orange-800"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-orange-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-stone-500">Total</p>
          <p className="mt-2 text-3xl font-black text-stone-900">
            {loading ? "..." : orders.length}
          </p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-amber-700">Active</p>
          <p className="mt-2 text-3xl font-black text-amber-900">
            {loading ? "..." : activeOrders}
          </p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-emerald-700">
            Completed
          </p>
          <p className="mt-2 text-3xl font-black text-emerald-900">
            {loading ? "..." : completedOrders}
          </p>
        </div>
        <div className="rounded-lg border border-red-100 bg-red-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-red-700">
            Cancelled
          </p>
          <p className="mt-2 text-3xl font-black text-red-900">
            {loading ? "..." : cancelledOrders}
          </p>
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-orange-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="flex h-11 flex-1 items-center gap-3 rounded-lg border border-orange-100 bg-orange-50 px-3">
            <Search size={17} className="text-orange-600" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search orders"
              className="w-full bg-transparent text-sm font-semibold text-stone-900 outline-none placeholder:text-stone-400"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
            className="h-11 rounded-lg border border-orange-100 bg-orange-50 px-3 text-sm font-extrabold text-stone-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          >
            <option value="all">All statuses</option>
            {orderStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </section>

      {error ? (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          <CheckCircle2 size={17} />
          {notice}
        </div>
      ) : null}

      <section className="mt-5 overflow-hidden rounded-lg border border-orange-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-orange-100">
            <thead className="bg-orange-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-black uppercase text-stone-500">
                  Order
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase text-stone-500">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase text-stone-500">
                  Items
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase text-stone-500">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase text-stone-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-black uppercase text-stone-500">
                  Update
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm font-bold text-stone-500"
                  >
                    <Loader2
                      size={18}
                      className="mr-2 inline animate-spin text-orange-700"
                    />
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm font-bold text-stone-500"
                  >
                    No orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const itemCount = order.items.reduce(
                    (total, item) => total + (item.quantity || 0),
                    0
                  );
                  const statusBusy = savingId === order._id;

                  return (
                    <tr key={order._id} className="align-middle">
                      <td className="px-4 py-4">
                        <div className="min-w-36">
                          <p className="font-extrabold text-stone-900">
                            #{order._id.slice(-6).toUpperCase()}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-stone-500">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="min-w-44">
                          <p className="font-extrabold text-stone-900">
                            {order.customerName}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-stone-500">
                            {order.customerPhone}
                          </p>
                          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-1 text-[11px] font-black text-stone-700">
                            {order.orderType === "Dining" ? (
                              <Utensils size={12} />
                            ) : (
                              <ShoppingBag size={12} />
                            )}
                            {getTableLabel(order)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="min-w-56">
                          <p className="text-sm font-black text-stone-900">
                            {itemCount} item{itemCount === 1 ? "" : "s"}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs font-semibold text-stone-500">
                            {order.items.map(getItemName).join(", ")}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-black text-stone-900">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ring-1",
                            statusClass[order.orderStatus],
                          ].join(" ")}
                        >
                          {order.orderStatus}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <select
                            value={order.orderStatus}
                            disabled={statusBusy}
                            onChange={(event) =>
                              handleStatusChange(
                                order,
                                event.target.value as OrderStatus
                              )
                            }
                            className="h-10 rounded-lg border border-orange-100 bg-white px-3 text-sm font-extrabold text-stone-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label="Update order status"
                          >
                            {orderStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <span className="flex size-10 items-center justify-center text-orange-700">
                            {statusBusy ? (
                              <Loader2 size={17} className="animate-spin" />
                            ) : (
                              <Clock3 size={17} />
                            )}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default OrdersPage;
