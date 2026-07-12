import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Printer,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  Table2,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api/axios";

type AssignedStaff = {
  _id: string;
  userName: string;
  email?: string;
  role?: string;
  isActive?: boolean;
};

type TableQr = {
  _id: string;
  tableNumber: number;
  qrUrl: string;
  qrCode: string;
  isActive: boolean;
  isOccupied: boolean;
  assignedStaff?: AssignedStaff | string | null;
};

type TableQrResponse = {
  success: boolean;
  data: TableQr[];
  message?: string;
};

type TableAssignment = {
  _id: string;
  assignedStaff: AssignedStaff | null;
};

type TableAssignmentsResponse = {
  tables: TableAssignment[];
};

const formatCount = (value: number) => value.toLocaleString("en-IN");

const formatTableLabel = (tableNumber: number) =>
  `T-${String(tableNumber).padStart(2, "0")}`;

const getAssignedStaffName = (table: TableQr) => {
  if (typeof table.assignedStaff === "object" && table.assignedStaff?.userName) {
    return table.assignedStaff.userName;
  }

  return "Unassigned";
};

const getReadableUrl = (value: string) => {
  try {
    const url = new URL(value);
    return `${url.host}${url.pathname}`;
  } catch {
    return value;
  }
};

function TablesPage() {
  const [tables, setTables] = useState<TableQr[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const loadQrCodes = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    try {
      const qrResponse = await api.get<TableQrResponse>("/tables/qrcodes");
      const qrTables = qrResponse.data.data || [];
      const assignmentMap = new Map<string, AssignedStaff | null>();

      try {
        const assignmentResponse =
          await api.get<TableAssignmentsResponse>("/admin/staff/table-assignments");

        assignmentResponse.data.tables.forEach((table) => {
          assignmentMap.set(table._id, table.assignedStaff);
        });
      } catch {
        assignmentMap.clear();
      }

      setTables(
        qrTables.map((table) => ({
          ...table,
          assignedStaff:
            assignmentMap.get(table._id) ?? table.assignedStaff ?? null,
        }))
      );
    } catch (loadError: any) {
      setError(
        loadError?.response?.data?.message ||
          "Failed to load table QR codes."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadQrCodes();
  }, [loadQrCodes]);

  const regenerateQrCodes = async () => {
    if (regenerating) return;

    setRegenerating(true);
    setError("");
    setNotice("");

    try {
      await api.post("/tables/qrcodes/generate");
      setNotice("QR codes regenerated successfully.");
      await loadQrCodes(false);
    } catch (regenerateError: any) {
      setError(
        regenerateError?.response?.data?.message ||
          "Failed to regenerate QR codes."
      );
    } finally {
      setRegenerating(false);
    }
  };

  const copyQrUrl = async (table: TableQr) => {
    if (!table.qrUrl) return;

    try {
      await navigator.clipboard.writeText(table.qrUrl);
      setCopiedId(table._id);
      window.setTimeout(() => setCopiedId(""), 1600);
    } catch {
      setError("Could not copy the QR menu link.");
    }
  };

  const filteredTables = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return tables;

    return tables.filter((table) => {
      const staffName = getAssignedStaffName(table).toLowerCase();

      return (
        String(table.tableNumber).includes(term) ||
        formatTableLabel(table.tableNumber).toLowerCase().includes(term) ||
        staffName.includes(term)
      );
    });
  }, [search, tables]);

  const totalTables = tables.length;
  const activeTables = tables.filter((table) => table.isActive).length;
  const occupiedTables = tables.filter((table) => table.isOccupied).length;
  const assignedTables = tables.filter(
    (table) => getAssignedStaffName(table) !== "Unassigned"
  ).length;

  return (
    <div className="admin-qr-page min-h-full text-stone-900">
      <style>{`
        @media print {
          aside,
          .admin-qr-actions,
          .admin-qr-summary,
          .admin-qr-search,
          .admin-qr-message {
            display: none !important;
          }

          .admin-qr-page {
            background: white !important;
            padding: 0 !important;
          }

          .admin-qr-grid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 16px !important;
          }

          .admin-qr-card {
            break-inside: avoid;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-lg bg-orange-100 text-orange-800 ring-1 ring-orange-200">
            <QrCode size={24} strokeWidth={2.4} />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-orange-700">
              Table Scanners
            </p>
            <h1 className="text-2xl font-black tracking-tight text-stone-950 md:text-3xl">
              Table QR Codes
            </h1>
          </div>
        </div>

        <div className="admin-qr-actions flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadQrCodes(false)}
            disabled={refreshing || loading}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-orange-100 bg-white px-3 text-sm font-bold text-stone-800 transition hover:border-orange-200 hover:text-orange-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
          <button
            type="button"
            onClick={regenerateQrCodes}
            disabled={regenerating}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-orange-100 bg-white px-3 text-sm font-bold text-stone-800 transition hover:border-orange-200 hover:text-orange-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {regenerating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RotateCcw size={16} />
            )}
            Regenerate
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-orange-700 px-3 text-sm font-black text-white shadow-sm shadow-orange-900/20 transition hover:bg-orange-800"
          >
            <Printer size={16} />
            Print
          </button>
        </div>
      </div>

      <section className="admin-qr-summary mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Tables", value: totalTables, icon: Table2 },
          { label: "Active Tables", value: activeTables, icon: CheckCircle2 },
          { label: "Occupied Tables", value: occupiedTables, icon: AlertTriangle },
          { label: "Assigned Staff", value: assignedTables, icon: UserRound },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-lg border border-orange-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-stone-500">
                    {item.label}
                  </p>
                  <p className="mt-1 text-2xl font-black text-stone-950">
                    {loading ? "..." : formatCount(item.value)}
                  </p>
                </div>
                <span className="flex size-10 items-center justify-center rounded-lg bg-orange-50 text-orange-800 ring-1 ring-orange-100">
                  <Icon size={20} strokeWidth={2.3} />
                </span>
              </div>
            </div>
          );
        })}
      </section>

      {error ? (
        <div className="admin-qr-message mt-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          <AlertTriangle size={17} />
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="admin-qr-message mt-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          <CheckCircle2 size={17} />
          {notice}
        </div>
      ) : null}

      <div className="admin-qr-search mt-5 flex flex-col gap-3 rounded-lg border border-orange-100 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search table or staff"
            className="h-11 w-full rounded-lg border border-orange-100 bg-orange-50/50 pl-10 pr-3 text-sm font-semibold text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100"
          />
        </div>
        <p className="text-sm font-bold text-stone-500">
          {loading
            ? "Loading QR cards"
            : `${formatCount(filteredTables.length)} of ${formatCount(
                totalTables
              )} tables`}
        </p>
      </div>

      <section className="admin-qr-grid mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {loading ? (
          <div className="col-span-full rounded-lg border border-orange-100 bg-white py-12 text-center text-sm font-bold text-stone-500 shadow-sm">
            <Loader2
              size={20}
              className="mr-2 inline animate-spin text-orange-700"
            />
            Loading table QR codes...
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="col-span-full rounded-lg border border-orange-100 bg-white py-12 text-center text-sm font-bold text-stone-500 shadow-sm">
            No table QR codes found.
          </div>
        ) : (
          filteredTables.map((table) => {
            const staffName = getAssignedStaffName(table);
            const isCopied = copiedId === table._id;

            return (
              <article
                key={table._id}
                className="admin-qr-card overflow-hidden rounded-lg border border-orange-100 bg-white shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 border-b border-orange-100 bg-orange-50/70 px-4 py-3">
                  <div>
                    <p className="text-xs font-black uppercase text-stone-500">
                      Table
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-stone-950">
                      {formatTableLabel(table.tableNumber)}
                    </h2>
                  </div>
                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-black uppercase ring-1",
                      table.isOccupied
                        ? "bg-amber-50 text-amber-700 ring-amber-200"
                        : table.isActive
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-stone-100 text-stone-600 ring-stone-200",
                    ].join(" ")}
                  >
                    {table.isOccupied
                      ? "Occupied"
                      : table.isActive
                        ? "Available"
                        : "Inactive"}
                  </span>
                </div>

                <div className="p-4">
                  <div className="mx-auto flex aspect-square max-w-56 items-center justify-center rounded-lg border border-orange-100 bg-white p-3 shadow-inner">
                    {table.qrCode ? (
                      <img
                        src={table.qrCode}
                        alt={`QR code for ${formatTableLabel(
                          table.tableNumber
                        )}`}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg bg-orange-50 text-center text-sm font-bold text-stone-500">
                        <QrCode size={28} className="text-orange-700" />
                        QR missing
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-lg bg-stone-50 px-3 py-3">
                    <div className="flex items-center gap-2 text-sm font-black text-stone-800">
                      <UserRound size={16} className="text-orange-700" />
                      <span className="min-w-0 truncate">{staffName}</span>
                    </div>
                    <p className="mt-2 break-all text-xs font-semibold text-stone-500">
                      {getReadableUrl(table.qrUrl)}
                    </p>
                  </div>

                  <div className="admin-qr-actions mt-4 grid grid-cols-3 gap-2">
                    <a
                      href={table.qrCode || "#"}
                      download={`table-${table.tableNumber}-qr.png`}
                      onClick={(event) => {
                        if (!table.qrCode) event.preventDefault();
                      }}
                      className={[
                        "inline-flex h-10 items-center justify-center rounded-lg border border-orange-100 bg-white text-stone-700 transition hover:border-orange-200 hover:text-orange-800",
                        table.qrCode ? "" : "pointer-events-none opacity-50",
                      ].join(" ")}
                      title="Download QR"
                    >
                      <Download size={16} />
                    </a>
                    <button
                      type="button"
                      onClick={() => copyQrUrl(table)}
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-orange-100 bg-white text-stone-700 transition hover:border-orange-200 hover:text-orange-800"
                      title="Copy menu link"
                    >
                      {isCopied ? (
                        <CheckCircle2 size={16} className="text-emerald-700" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                    <a
                      href={table.qrUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-orange-100 bg-white text-stone-700 transition hover:border-orange-200 hover:text-orange-800"
                      title="Open menu"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

export default TablesPage;
