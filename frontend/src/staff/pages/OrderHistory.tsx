import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, Search } from "lucide-react";
import { api } from "../../api/axios";
import { useOrderEvents } from "../../utils/useOrderEvents";
import type { StaffOrder, StaffOrderStatus } from "../types";
import {
  formatCurrency,
  formatDate,
  getApiMessage,
  getItemName,
  getOrderLabel,
  getTableLabel,
  staffStatusLabels,
  statusClass,
} from "../orderUtils";

type StaffOrdersResponse = {
  orders: StaffOrder[];
};

function OrderHistory() {
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StaffOrderStatus | "all">(
    "all"
  );

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<StaffOrdersResponse>("/staff/orders", {
        params: { scope: "history" },
      });
      setOrders(response.data.orders || []);
    } catch (loadError) {
      setError(getApiMessage(loadError, "Failed to load order history"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const handleOrderEvent = useCallback(() => {
    void loadOrders();
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

  const servedOrders = orders.filter(
    (order) => order.orderStatus === "COMPLETED"
  ).length;
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-extrabold uppercase text-teal-700">
            Completed Queue
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-950 sm:text-4xl">
            Order History
          </h1>
        </div>
        <button
          type="button"
          onClick={loadOrders}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:border-teal-200 hover:text-teal-800"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase text-slate-500">Total</p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {loading ? "..." : orders.length}
          </p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <CheckCircle2 className="text-emerald-700" size={22} />
          <p className="mt-4 text-xs font-black uppercase text-emerald-700">
            Completed
          </p>
          <p className="mt-2 text-3xl font-black text-emerald-950">
            {loading ? "..." : servedOrders}
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
              placeholder="Search order history"
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
            {(["COMPLETED"] as StaffOrderStatus[]).map(
              (status) => (
                <option key={status} value={status}>
                  {staffStatusLabels[status]}
                </option>
              )
            )}
          </select>
        </div>
      </section>

      {error ? (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
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
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm font-bold text-slate-500"
                  >
                    No history found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const itemCount = order.items.reduce(
                    (total, item) => total + (item.quantity || 0),
                    0
                  );

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
                            statusClass[order.orderStatus],
                          ].join(" ")}
                        >
                          {staffStatusLabels[order.orderStatus]}
                        </span>
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

export default OrderHistory;
