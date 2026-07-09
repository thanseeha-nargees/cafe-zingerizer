import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  RefreshCw,
  Table2,
  Timer,
  Utensils,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../api/axios";
import type { StaffOrder, StaffSummary, StaffTable } from "../types";
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

type DashboardResponse = {
  summary: StaffSummary;
  tables: StaffTable[];
  recentOrders: StaffOrder[];
};

const emptySummary: StaffSummary = {
  assignedTables: 0,
  occupiedTables: 0,
  activeOrders: 0,
  readyOrders: 0,
  servedToday: 0,
};

function StaffDashboard() {
  const [summary, setSummary] = useState<StaffSummary>(emptySummary);
  const [tables, setTables] = useState<StaffTable[]>([]);
  const [recentOrders, setRecentOrders] = useState<StaffOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError("");

    try {
      const response = await api.get<DashboardResponse>("/staff/dashboard");
      setSummary(response.data.summary || emptySummary);
      setTables(response.data.tables || []);
      setRecentOrders(response.data.recentOrders || []);
    } catch (loadError) {
      setError(getApiMessage(loadError, "Failed to load dashboard"));
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadDashboard();
    const interval = window.setInterval(() => {
      void loadDashboard(true);
    }, 10000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-extrabold uppercase text-teal-700">
            Service Desk
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-950 sm:text-4xl">
            Dashboard
          </h1>
        </div>
        <button
          type="button"
          onClick={() => loadDashboard()}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:border-teal-200 hover:text-teal-800"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <Table2 className="text-teal-700" size={22} />
          <p className="mt-4 text-xs font-black uppercase text-slate-500">
            Assigned Tables
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {loading ? "..." : summary.assignedTables}
          </p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <Utensils className="text-amber-700" size={22} />
          <p className="mt-4 text-xs font-black uppercase text-amber-700">
            Occupied
          </p>
          <p className="mt-2 text-3xl font-black text-amber-950">
            {loading ? "..." : summary.occupiedTables}
          </p>
        </div>
        <div className="rounded-lg border border-sky-100 bg-sky-50 p-5 shadow-sm">
          <ClipboardList className="text-sky-700" size={22} />
          <p className="mt-4 text-xs font-black uppercase text-sky-700">
            Active Orders
          </p>
          <p className="mt-2 text-3xl font-black text-sky-950">
            {loading ? "..." : summary.activeOrders}
          </p>
        </div>
        <div className="rounded-lg border border-violet-100 bg-violet-50 p-5 shadow-sm">
          <Timer className="text-violet-700" size={22} />
          <p className="mt-4 text-xs font-black uppercase text-violet-700">
            Ready
          </p>
          <p className="mt-2 text-3xl font-black text-violet-950">
            {loading ? "..." : summary.readyOrders}
          </p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <CheckCircle2 className="text-emerald-700" size={22} />
          <p className="mt-4 text-xs font-black uppercase text-emerald-700">
            Served Today
          </p>
          <p className="mt-2 text-3xl font-black text-emerald-950">
            {loading ? "..." : summary.servedToday}
          </p>
        </div>
      </section>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-lg font-extrabold text-slate-950">
              My Assigned Tables
            </h2>
            <Link
              to="/staff/tables"
              className="text-sm font-extrabold text-teal-700 hover:text-teal-900"
            >
              View all
            </Link>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {loading ? (
              <div className="col-span-full py-10 text-center text-sm font-bold text-slate-500">
                <Loader2 className="mr-2 inline animate-spin" size={18} />
                Loading tables...
              </div>
            ) : tables.length === 0 ? (
              <div className="col-span-full py-10 text-center text-sm font-bold text-slate-500">
                No tables assigned.
              </div>
            ) : (
              tables.slice(0, 6).map((table) => (
                <div
                  key={table._id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-xl font-black text-slate-950">
                    Table {table.tableNumber}
                  </p>
                  <p
                    className={[
                      "mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ring-1",
                      table.isOccupied
                        ? "bg-amber-50 text-amber-700 ring-amber-200"
                        : "bg-emerald-50 text-emerald-700 ring-emerald-200",
                    ].join(" ")}
                  >
                    {table.isOccupied ? "Occupied" : "Open"}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-lg font-extrabold text-slate-950">
              Active Orders
            </h2>
            <Link
              to="/staff/orders/active"
              className="text-sm font-extrabold text-teal-700 hover:text-teal-900"
            >
              Open queue
            </Link>
          </div>
          <div className="divide-y divide-slate-200">
            {loading ? (
              <div className="py-10 text-center text-sm font-bold text-slate-500">
                <Loader2 className="mr-2 inline animate-spin" size={18} />
                Loading orders...
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="py-10 text-center text-sm font-bold text-slate-500">
                No active orders.
              </div>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order._id}
                  className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-950">
                      {getOrderLabel(order._id)} · {getTableLabel(order)}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                      {order.items.map(getItemName).join(", ")}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 md:justify-end">
                    <p className="text-sm font-black text-slate-950">
                      {formatCurrency(order.totalAmount)}
                    </p>
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-black uppercase ring-1",
                        statusClass[order.orderStatus],
                      ].join(" ")}
                    >
                      {staffStatusLabels[order.orderStatus]}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default StaffDashboard;
