import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChefHat,
  Clock3,
  Handshake,
  Loader2,
  RefreshCw,
  Search,
  Send,
  Soup,
  XCircle,
} from "lucide-react";
import { api } from "../../api/axios";
import { useAppSelector } from "../../app/hooks";
import { useOrderEvents } from "../../utils/useOrderEvents";
import type {
  FoodReadySmsResponse,
  StaffOrder,
  StaffOrderStatus,
} from "../types";
import {
  formatCurrency,
  formatDate,
  getAssignedStaffId,
  getAssignmentLabel,
  getApiMessage,
  getItemName,
  getOrderLabel,
  getTableLabel,
  staffActionStatuses,
  staffStatusLabels,
  staffVisibleStatuses,
  statusClass,
  takeawayActionStatuses,
  terminalStatuses,
} from "../orderUtils";

type StaffOrdersResponse = {
  orders: StaffOrder[];
};

type UpdateOrderStatusResponse = {
  order: StaffOrder;
  message?: string;
  foodReadySms?: FoodReadySmsResponse | null;
};

type AcceptTakeawayOrderResponse = {
  order: StaffOrder;
  message?: string;
};

const actionIcon: Record<StaffOrderStatus, typeof CheckCircle2> = {
  PENDING: Clock3,
  CONFIRMED: CheckCircle2,
  ACCEPTED: CheckCircle2,
  PREPARING: ChefHat,
  READY: Send,
  COMPLETED: Soup,
  CANCELLED: XCircle,
};

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

const formatCountdown = (remainingMs: number) => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
};

const getReadyLabel = (order: StaffOrder) =>
  order.orderType === "Takeaway" ? "Ready for Pickup" : "Ready to Serve";

const getPreparationCountdown = (order: StaffOrder, now: number) => {
  if (order.orderStatus !== "PREPARING" || !order.estimatedReadyAt) {
    return null;
  }

  const estimatedReadyAt = new Date(order.estimatedReadyAt).getTime();

  if (Number.isNaN(estimatedReadyAt)) {
    return null;
  }

  const remainingMs = Math.max(estimatedReadyAt - now, 0);

  return {
    isReady: remainingMs <= 0,
    remainingText: formatCountdown(remainingMs),
  };
};

function ActiveOrders() {
  const currentUser = useAppSelector((state) => state.auth.currentUser);
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [acceptingId, setAcceptingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [statusFilter, setStatusFilter] = useState<StaffOrderStatus | "all">(
    "all"
  );

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError("");

    try {
      const response = await api.get<StaffOrdersResponse>("/staff/orders", {
        params: { scope: "active" },
      });
      setOrders(response.data.orders || []);
    } catch (loadError) {
      setError(getApiMessage(loadError, "Failed to load active orders"));
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadOrders();
    const interval = window.setInterval(() => {
      void loadOrders(true);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loadOrders]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const handleOrderEvent = useCallback(() => {
    void loadOrders(true);
  }, [loadOrders]);

  useOrderEvents(handleOrderEvent);

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
        getTableLabel(order).toLowerCase().includes(term) ||
        itemNames.includes(term);

      return statusMatch && searchMatch;
    });
  }, [orders, search, statusFilter]);

  const handleStatusChange = async (
    order: StaffOrder,
    orderStatus: StaffOrderStatus
  ) => {
    if (order.orderStatus === orderStatus) return;

    setSavingId(order._id);
    setError("");
    setNotice("");

    try {
      const response = await api.patch<UpdateOrderStatusResponse>(
        `/staff/orders/${order._id}/status`,
        { orderStatus }
      );

      setOrders((current) => {
        if (terminalStatuses.includes(response.data.order.orderStatus)) {
          return current.filter((item) => item._id !== order._id);
        }

        return current.map((item) =>
          item._id === order._id ? response.data.order : item
        );
      });
      setNotice(
        getOrderUpdateNotice(order._id, response.data.foodReadySms || null)
      );

      if (response.data.foodReadySms?.status === "failed") {
        setError(
          response.data.foodReadySms.error ||
            response.data.message ||
            "Order status updated, but SMS failed"
        );
      }
    } catch (saveError) {
      setError(getApiMessage(saveError, "Unable to update order status"));
    } finally {
      setSavingId("");
    }
  };

  const handleAcceptOrder = async (order: StaffOrder) => {
    setAcceptingId(order._id);
    setError("");
    setNotice("");

    try {
      const response = await api.patch<AcceptTakeawayOrderResponse>(
        `/staff/orders/${order._id}/accept`
      );

      setOrders((current) =>
        current.map((item) =>
          item._id === order._id ? response.data.order : item
        )
      );
      setNotice(`${getOrderLabel(order._id)} accepted.`);
    } catch (acceptError) {
      setError(getApiMessage(acceptError, "Unable to accept order"));
      void loadOrders(true);
    } finally {
      setAcceptingId("");
    }
  };

  const activeCount = orders.length;
  const readyCount = orders.filter((order) => order.orderStatus === "READY").length;
  const preparingCount = orders.filter(
    (order) => order.orderStatus === "PREPARING"
  ).length;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-extrabold uppercase text-teal-700">
            Assigned Queue
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-950 sm:text-4xl">
            My Orders
          </h1>
        </div>
        <button
          type="button"
          onClick={() => loadOrders()}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:border-teal-200 hover:text-teal-800"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-slate-500">Active</p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {loading ? "..." : activeCount}
          </p>
        </div>
        <div className="rounded-lg border border-orange-100 bg-orange-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-orange-700">
            Preparing
          </p>
          <p className="mt-2 text-3xl font-black text-orange-950">
            {loading ? "..." : preparingCount}
          </p>
        </div>
        <div className="rounded-lg border border-violet-100 bg-violet-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-violet-700">Ready</p>
          <p className="mt-2 text-3xl font-black text-violet-950">
            {loading ? "..." : readyCount}
          </p>
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="flex h-11 flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3">
            <Search size={17} className="text-teal-700" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search active orders"
              className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StaffOrderStatus | "all")
            }
            className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-extrabold text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          >
            <option value="all">All statuses</option>
            {staffVisibleStatuses.map((status) => (
              <option key={status} value={status}>
                {staffStatusLabels[status]}
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

      <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-500">
                  Order
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-500">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-500">
                  Items
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-500">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-black uppercase text-slate-500">
                  Update
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm font-bold text-slate-500"
                  >
                    <Loader2
                      size={18}
                      className="mr-2 inline animate-spin text-teal-700"
                    />
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm font-bold text-slate-500"
                  >
                    No active orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const itemCount = order.items.reduce(
                    (total, item) => total + (item.quantity || 0),
                    0
                  );
                  const statusBusy = savingId === order._id;
                  const acceptBusy = acceptingId === order._id;
                  const assignedStaffId = getAssignedStaffId(order);
                  const isTakeaway = order.orderType === "Takeaway";
                  const isUnassignedTakeaway = isTakeaway && !assignedStaffId;
                  const isAssignedToMe =
                    Boolean(currentUser?.id) && assignedStaffId === currentUser?.id;
                  const canUpdateStatus = !isTakeaway || isAssignedToMe;
                  const actionStatuses = isTakeaway
                    ? takeawayActionStatuses
                    : staffActionStatuses;
                  const preparationCountdown = getPreparationCountdown(
                    order,
                    now
                  );
                  const displayStatus: StaffOrderStatus =
                    preparationCountdown?.isReady ? "READY" : order.orderStatus;

                  return (
                    <tr key={order._id} className="align-middle">
                      <td className="px-4 py-4">
                        <div className="min-w-36">
                          <p className="font-extrabold text-slate-950">
                            {getOrderLabel(order._id)}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="min-w-44">
                          <p className="font-extrabold text-slate-950">
                            {order.customerName}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {order.customerPhone}
                          </p>
                          <p className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-700">
                            {getTableLabel(order)}
                          </p>
                          {isTakeaway ? (
                            <p
                              className={[
                                "mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-black",
                                isUnassignedTakeaway
                                  ? "bg-amber-50 text-amber-700"
                                  : isAssignedToMe
                                    ? "bg-teal-50 text-teal-700"
                                    : "bg-slate-100 text-slate-600",
                              ].join(" ")}
                            >
                              {getAssignmentLabel(order, currentUser?.id)}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="min-w-56">
                          <p className="text-sm font-black text-slate-950">
                            {itemCount} item{itemCount === 1 ? "" : "s"}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">
                            {order.items
                              .map(
                                (item) =>
                                  `${item.quantity || 0}x ${getItemName(item)}`
                              )
                              .join(", ")}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-black text-slate-950">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ring-1",
                            statusClass[displayStatus],
                          ].join(" ")}
                        >
                          {staffStatusLabels[displayStatus]}
                        </span>
                        {preparationCountdown ? (
                          <div
                            className={[
                              "mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ring-1",
                              preparationCountdown.isReady
                                ? "bg-violet-50 text-violet-700 ring-violet-200"
                                : "bg-orange-50 text-orange-700 ring-orange-200",
                            ].join(" ")}
                          >
                            <Clock3 size={13} />
                            {preparationCountdown.isReady
                              ? getReadyLabel(order)
                              : preparationCountdown.remainingText}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex min-w-96 flex-wrap justify-end gap-2">
                          {isUnassignedTakeaway ? (
                            <button
                              type="button"
                              onClick={() => handleAcceptOrder(order)}
                              disabled={acceptBusy || statusBusy}
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-teal-200 bg-teal-700 px-3 text-xs font-extrabold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {acceptBusy ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Handshake size={14} />
                              )}
                              Accept Order
                            </button>
                          ) : null}

                          {actionStatuses.map((status) => {
                            const Icon = actionIcon[status];
                            const isCurrent = order.orderStatus === status;
                            const isDisabled =
                              statusBusy ||
                              acceptBusy ||
                              isCurrent ||
                              !canUpdateStatus ||
                              isUnassignedTakeaway;

                            return (
                              <button
                                key={status}
                                type="button"
                                onClick={() => handleStatusChange(order, status)}
                                disabled={isDisabled}
                                className={[
                                  "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60",
                                  isCurrent
                                    ? "border-teal-200 bg-teal-50 text-teal-800"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:text-teal-800",
                                ].join(" ")}
                              >
                                {statusBusy && !isCurrent ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Icon size={14} />
                                )}
                                {staffStatusLabels[status]}
                              </button>
                            );
                          })}
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

export default ActiveOrders;
