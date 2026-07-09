import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search, Table2, Utensils } from "lucide-react";
import { api } from "../../api/axios";
import type { StaffTable } from "../types";
import { getApiMessage } from "../orderUtils";

type AssignedTablesResponse = {
  tables: StaffTable[];
};

function AssignedTables() {
  const [tables, setTables] = useState<StaffTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadTables = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<AssignedTablesResponse>("/staff/tables");
      setTables(response.data.tables || []);
    } catch (loadError) {
      setError(getApiMessage(loadError, "Failed to load assigned tables"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTables();
  }, []);

  const filteredTables = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return tables;

    return tables.filter((table) =>
      `table ${table.tableNumber} ${table.label || ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [search, tables]);

  const occupiedTables = tables.filter((table) => table.isOccupied).length;
  const openTables = tables.filter((table) => !table.isOccupied).length;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-extrabold uppercase text-teal-700">
            Table Coverage
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-950 sm:text-4xl">
            My Assigned Tables
          </h1>
        </div>
        <button
          type="button"
          onClick={loadTables}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:border-teal-200 hover:text-teal-800"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <Table2 className="text-teal-700" size={22} />
          <p className="mt-4 text-xs font-black uppercase text-slate-500">
            Assigned
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {loading ? "..." : tables.length}
          </p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <Utensils className="text-amber-700" size={22} />
          <p className="mt-4 text-xs font-black uppercase text-amber-700">
            Occupied
          </p>
          <p className="mt-2 text-3xl font-black text-amber-950">
            {loading ? "..." : occupiedTables}
          </p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <Table2 className="text-emerald-700" size={22} />
          <p className="mt-4 text-xs font-black uppercase text-emerald-700">
            Open
          </p>
          <p className="mt-2 text-3xl font-black text-emerald-950">
            {loading ? "..." : openTables}
          </p>
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex h-11 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3">
          <Search size={17} className="text-teal-700" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tables"
            className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400"
          />
        </label>
      </section>

      {error ? (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <div className="col-span-full rounded-lg border border-slate-200 bg-white px-4 py-12 text-center text-sm font-bold text-slate-500 shadow-sm">
            <Loader2 className="mr-2 inline animate-spin text-teal-700" size={18} />
            Loading tables...
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="col-span-full rounded-lg border border-slate-200 bg-white px-4 py-12 text-center text-sm font-bold text-slate-500 shadow-sm">
            No assigned tables found.
          </div>
        ) : (
          filteredTables.map((table) => (
            <article
              key={table._id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-slate-500">
                    Table
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-slate-950">
                    {table.tableNumber}
                  </h2>
                </div>
                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs font-black uppercase ring-1",
                    table.isOccupied
                      ? "bg-amber-50 text-amber-700 ring-amber-200"
                      : "bg-emerald-50 text-emerald-700 ring-emerald-200",
                  ].join(" ")}
                >
                  {table.isOccupied ? "Occupied" : "Open"}
                </span>
              </div>

              <div className="mt-5 border-t border-slate-200 pt-4">
                <p className="text-xs font-black uppercase text-slate-500">
                  Availability
                </p>
                <p className="mt-2 text-sm font-extrabold text-slate-800">
                  {table.isActive ? "Active" : "Inactive"}
                </p>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

export default AssignedTables;
