import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Table2,
  Trash2,
  UserCheck,
  UserRoundCog,
  UserRoundX,
  X,
} from "lucide-react";
import { api } from "../../api/axios";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  clearStaffFeedback,
  createStaff,
  deleteStaff,
  fetchStaff,
  setLimit,
  setPage,
  setRoleFilter,
  setSearch,
  setStatusFilter,
  updateStaff,
} from "../staff/staffSlice";
import type {
  StaffFormPayload,
  StaffMember,
  StaffRole,
  StaffRoleFilter,
  StaffStatusFilter,
} from "../staff/staffSlice";

type StaffForm = {
  userName: string;
  email: string;
  phoneNumber: string;
  role: StaffRole;
  isActive: boolean;
  password: string;
};

type AssignableStaff = {
  _id: string;
  userName: string;
  email: string;
  phoneNumber?: string;
  role?: StaffRole;
  isActive: boolean;
};

type AssignedTable = {
  _id: string;
  tableNumber: number;
  isActive: boolean;
  isOccupied: boolean;
  assignedStaff: AssignableStaff | null;
};

const initialForm: StaffForm = {
  userName: "",
  email: "",
  phoneNumber: "",
  role: "staff",
  isActive: true,
  password: "",
};

const emailRegex =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|in|org|net|edu|co)$/;

const statusFilters: StaffStatusFilter[] = ["all", "active", "inactive"];
const roleFilters: StaffRoleFilter[] = ["all", "admin", "staff"];

const formatCount = (value: number) =>
  new Intl.NumberFormat("en-IN").format(value || 0);

const formatDate = (dateValue?: string) => {
  if (!dateValue) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateValue));
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "S";

const getRoleLabel = (role: StaffRoleFilter) => {
  if (role === "admin") return "Admin";
  if (role === "staff") return "Staff";
  return "All roles";
};

const getStatusLabel = (status: StaffStatusFilter) => {
  if (status === "active") return "Active";
  if (status === "inactive") return "Inactive";
  return "All";
};

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

function StaffPage() {
  const dispatch = useAppDispatch();
  const {
    items,
    summary,
    pagination,
    search,
    status,
    role,
    page,
    limit,
    loading,
    saving,
    savingId,
    deletingId,
    error,
    notice,
  } = useAppSelector((state) => state.staff);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [form, setForm] = useState<StaffForm>(initialForm);
  const [formError, setFormError] = useState("");
  const [assignmentTables, setAssignmentTables] = useState<AssignedTable[]>([]);
  const [assignableStaff, setAssignableStaff] = useState<AssignableStaff[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignmentSavingId, setAssignmentSavingId] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentNotice, setAssignmentNotice] = useState("");

  const query = useMemo(
    () => ({ search, status, role, page, limit }),
    [limit, page, role, search, status]
  );

  const loadTableAssignments = useCallback(async () => {
    setAssignmentsLoading(true);
    setAssignmentError("");

    try {
      const response = await api.get<{
        tables: AssignedTable[];
        staff: AssignableStaff[];
      }>("/admin/staff/table-assignments");

      setAssignmentTables(response.data.tables || []);
      setAssignableStaff(response.data.staff || []);
    } catch (loadError) {
      setAssignmentError(
        getApiMessage(loadError, "Failed to load table assignments")
      );
    } finally {
      setAssignmentsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void dispatch(fetchStaff(query));
    }, search.trim() ? 250 : 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [dispatch, query, search]);

  useEffect(() => {
    void loadTableAssignments();
  }, [loadTableAssignments]);

  const refreshStaff = () => {
    void dispatch(fetchStaff(query));
    void loadTableAssignments();
  };

  const resetForm = () => {
    setForm(initialForm);
    setFormError("");
    setEditingStaff(null);
  };

  const openCreateForm = () => {
    resetForm();
    dispatch(clearStaffFeedback());
    setShowForm(true);
  };

  const openEditForm = (staff: StaffMember) => {
    setEditingStaff(staff);
    setForm({
      userName: staff.userName,
      email: staff.email,
      phoneNumber: staff.phoneNumber || "",
      role: staff.role,
      isActive: staff.isActive,
      password: "",
    });
    setFormError("");
    dispatch(clearStaffFeedback());
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const openDetails = (staff: StaffMember) => {
    dispatch(clearStaffFeedback());
    setSelectedStaff(null);
    setDetailsError("");
    setDetailsLoading(true);
    setShowDetails(true);

    api
      .get<{ staff: StaffMember }>(`/admin/staff/${staff._id}`)
      .then((response) => {
        setSelectedStaff(response.data.staff);
      })
      .catch((loadError) => {
        setDetailsError(
          getApiMessage(loadError, "Failed to load staff details")
        );
      })
      .finally(() => {
        setDetailsLoading(false);
      });
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedStaff(null);
    setDetailsError("");
  };

  const updateField = <Field extends keyof StaffForm>(
    field: Field,
    value: StaffForm[Field]
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validateForm = () => {
    if (form.userName.trim().length < 3) {
      return "Name must be at least 3 characters.";
    }

    if (!emailRegex.test(form.email.trim())) {
      return "Enter a valid email address.";
    }

    if (!editingStaff && form.password.trim().length < 6) {
      return "Password must be at least 6 characters.";
    }

    if (editingStaff && form.password && form.password.trim().length < 6) {
      return "Password must be at least 6 characters.";
    }

    return "";
  };

  const reloadAfterMutation = (nextPage = page) => {
    void dispatch(fetchStaff({ ...query, page: nextPage }));
    void loadTableAssignments();
  };

  const handleTableAssignment = async (tableId: string, staffId: string) => {
    setAssignmentSavingId(tableId);
    setAssignmentError("");
    setAssignmentNotice("");

    try {
      const response = await api.patch<{ table: AssignedTable; message?: string }>(
        `/admin/staff/table-assignments/${tableId}`,
        { staffId: staffId || null }
      );

      setAssignmentTables((current) =>
        current.map((table) =>
          table._id === response.data.table._id ? response.data.table : table
        )
      );
      setAssignmentNotice(response.data.message || "Table assignment updated.");
    } catch (saveError) {
      setAssignmentError(
        getApiMessage(saveError, "Unable to update table assignment")
      );
    } finally {
      setAssignmentSavingId("");
    }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError("");

    const payload: StaffFormPayload = {
      userName: form.userName.trim(),
      email: form.email.trim().toLowerCase(),
      phoneNumber: form.phoneNumber.trim(),
      role: form.role,
      isActive: form.isActive,
    };

    if (form.password.trim()) {
      payload.password = form.password.trim();
    }

    try {
      if (editingStaff) {
        await dispatch(
          updateStaff({ id: editingStaff._id, changes: payload })
        ).unwrap();
        closeForm();
        reloadAfterMutation();
        return;
      }

      await dispatch(createStaff(payload)).unwrap();
      closeForm();

      if (page !== 1) {
        dispatch(setPage(1));
      } else {
        reloadAfterMutation(1);
      }
    } catch {
      return;
    }
  };

  const handleToggleStatus = async (staff: StaffMember) => {
    try {
      await dispatch(
        updateStaff({
          id: staff._id,
          changes: { isActive: !staff.isActive },
        })
      ).unwrap();
      reloadAfterMutation();
    } catch {
      return;
    }
  };

  const handleDelete = async (staff: StaffMember) => {
    const confirmed = window.confirm(`Delete ${staff.userName}?`);

    if (!confirmed) return;

    try {
      await dispatch(deleteStaff(staff._id)).unwrap();

      const nextPage = items.length === 1 && page > 1 ? page - 1 : page;

      if (nextPage !== page) {
        dispatch(setPage(nextPage));
      } else {
        reloadAfterMutation(nextPage);
      }
    } catch {
      return;
    }
  };

  const firstVisible = pagination.total
    ? (pagination.page - 1) * pagination.limit + 1
    : 0;
  const lastVisible = Math.min(
    pagination.page * pagination.limit,
    pagination.total
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-wide text-orange-700">
            Team Access
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Staff
          </h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={refreshStaff}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-orange-100 bg-white px-4 text-sm font-bold text-stone-800 shadow-sm transition hover:border-orange-200 hover:text-orange-800"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-orange-700 px-4 text-sm font-bold text-white shadow-sm shadow-orange-900/20 transition hover:bg-orange-800"
          >
            <Plus size={17} />
            Add Staff
          </button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-orange-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-stone-500">
            Total
          </p>
          <p className="mt-2 text-3xl font-black text-stone-900">
            {loading ? "..." : formatCount(summary.totalStaff)}
          </p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
            Active
          </p>
          <p className="mt-2 text-3xl font-black text-emerald-900">
            {loading ? "..." : formatCount(summary.activeStaff)}
          </p>
        </div>
        <div className="rounded-lg border border-red-100 bg-red-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-red-700">
            Inactive
          </p>
          <p className="mt-2 text-3xl font-black text-red-900">
            {loading ? "..." : formatCount(summary.inactiveStaff)}
          </p>
        </div>
        <div className="rounded-lg border border-sky-100 bg-sky-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">
            Staff Roles
          </p>
          <p className="mt-2 text-3xl font-black text-sky-900">
            {loading
              ? "..."
              : `${formatCount(summary.adminStaff)} / ${formatCount(
                  summary.regularStaff
                )}`}
          </p>
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-orange-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="flex h-11 flex-1 items-center gap-3 rounded-lg border border-orange-100 bg-orange-50 px-3">
            <Search size={17} className="text-orange-600" />
            <input
              type="search"
              value={search}
              onChange={(event) => dispatch(setSearch(event.target.value))}
              placeholder="Search staff"
              className="w-full bg-transparent text-sm font-semibold text-stone-900 outline-none placeholder:text-stone-400"
            />
          </label>

          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-orange-100 bg-orange-50">
            {statusFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => dispatch(setStatusFilter(filter))}
                className={[
                  "h-11 px-3 text-sm font-extrabold transition",
                  status === filter
                    ? "bg-stone-950 text-white"
                    : "text-stone-700 hover:bg-white",
                ].join(" ")}
              >
                {getStatusLabel(filter)}
              </button>
            ))}
          </div>

          <select
            value={role}
            onChange={(event) =>
              dispatch(setRoleFilter(event.target.value as StaffRoleFilter))
            }
            className="h-11 rounded-lg border border-orange-100 bg-orange-50 px-3 text-sm font-extrabold text-stone-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          >
            {roleFilters.map((filter) => (
              <option key={filter} value={filter}>
                {getRoleLabel(filter)}
              </option>
            ))}
          </select>

          <select
            value={limit}
            onChange={(event) => dispatch(setLimit(Number(event.target.value)))}
            className="h-11 rounded-lg border border-orange-100 bg-orange-50 px-3 text-sm font-extrabold text-stone-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            aria-label="Rows per page"
          >
            {[5, 10, 20, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize} rows
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

      <section className="mt-5 rounded-lg border border-orange-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-orange-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-orange-100 text-orange-800">
              <Table2 size={19} />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-stone-900">
                Table Assignments
              </h2>
              <p className="text-sm font-semibold text-stone-500">
                {assignmentsLoading
                  ? "Loading tables"
                  : `${formatCount(assignmentTables.length)} tables`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadTableAssignments}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-orange-100 bg-white px-3 text-sm font-bold text-stone-800 transition hover:border-orange-200 hover:text-orange-800"
          >
            <RefreshCw
              size={15}
              className={assignmentsLoading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {assignmentError ? (
          <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {assignmentError}
          </div>
        ) : null}

        {assignmentNotice ? (
          <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <CheckCircle2 size={17} />
            {assignmentNotice}
          </div>
        ) : null}

        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {assignmentsLoading ? (
            <div className="col-span-full py-8 text-center text-sm font-bold text-stone-500">
              <Loader2
                size={18}
                className="mr-2 inline animate-spin text-orange-700"
              />
              Loading table assignments...
            </div>
          ) : assignmentTables.length === 0 ? (
            <div className="col-span-full py-8 text-center text-sm font-bold text-stone-500">
              No tables found.
            </div>
          ) : (
            assignmentTables.map((table) => {
              const savingAssignment = assignmentSavingId === table._id;

              return (
                <div
                  key={table._id}
                  className="rounded-lg border border-orange-100 bg-orange-50/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase text-stone-500">
                        Table
                      </p>
                      <p className="mt-1 text-2xl font-black text-stone-900">
                        {table.tableNumber}
                      </p>
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

                  <label
                    htmlFor={`assign-table-${table._id}`}
                    className="mt-4 block text-xs font-black uppercase text-stone-500"
                  >
                    Assigned staff
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    <select
                      id={`assign-table-${table._id}`}
                      value={table.assignedStaff?._id || ""}
                      onChange={(event) =>
                        handleTableAssignment(table._id, event.target.value)
                      }
                      disabled={savingAssignment}
                      className="h-10 min-w-0 flex-1 rounded-lg border border-orange-100 bg-white px-3 text-sm font-extrabold text-stone-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <option value="">Unassigned</option>
                      {assignableStaff.map((staff) => (
                        <option key={staff._id} value={staff._id}>
                          {staff.userName}
                        </option>
                      ))}
                    </select>
                    <span className="flex size-10 shrink-0 items-center justify-center text-orange-700">
                      {savingAssignment ? (
                        <Loader2 size={17} className="animate-spin" />
                      ) : (
                        <Table2 size={17} />
                      )}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-lg border border-orange-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-orange-100">
            <thead className="bg-orange-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-stone-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-stone-500">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-stone-500">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-stone-500">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-stone-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-stone-500">
                  Actions
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
                    Loading staff...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm font-bold text-stone-500"
                  >
                    No staff found.
                  </td>
                </tr>
              ) : (
                items.map((staff) => {
                  const rowBusy = savingId === staff._id;
                  const deleting = deletingId === staff._id;

                  return (
                    <tr key={staff._id} className="align-middle">
                      <td className="px-4 py-4">
                        <div className="flex min-w-56 items-center gap-3">
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-sm font-black text-orange-800">
                            {getInitials(staff.userName)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-extrabold text-stone-900">
                              {staff.userName}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-stone-500">
                              Added {formatDate(staff.createdAt)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="flex min-w-56 items-center gap-2 text-sm font-semibold text-stone-600">
                          <Mail size={14} className="text-orange-700" />
                          <span className="break-all">{staff.email}</span>
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="flex min-w-36 items-center gap-2 text-sm font-bold text-stone-700">
                          <Phone size={14} className="text-orange-700" />
                          {staff.phoneNumber || "Not added"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={[
                            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black uppercase ring-1",
                            staff.role === "admin"
                              ? "bg-sky-50 text-sky-700 ring-sky-200"
                              : "bg-stone-100 text-stone-700 ring-stone-200",
                          ].join(" ")}
                        >
                          {staff.role === "admin" ? (
                            <ShieldCheck size={13} />
                          ) : (
                            <UserRoundCog size={13} />
                          )}
                          {getRoleLabel(staff.role)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={[
                            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black uppercase ring-1",
                            staff.isActive
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              : "bg-red-50 text-red-700 ring-red-200",
                          ].join(" ")}
                        >
                          {staff.isActive ? (
                            <UserCheck size={13} />
                          ) : (
                            <UserRoundX size={13} />
                          )}
                          {staff.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openDetails(staff)}
                            title="View staff details"
                            className="flex size-9 items-center justify-center rounded-lg border border-orange-100 bg-white text-stone-700 transition hover:border-orange-200 hover:text-orange-800"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(staff)}
                            disabled={rowBusy || deleting}
                            title={
                              staff.isActive
                                ? "Deactivate staff"
                                : "Activate staff"
                            }
                            className="flex size-9 items-center justify-center rounded-lg border border-orange-100 bg-white text-stone-700 transition hover:border-orange-200 hover:text-orange-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {rowBusy ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : staff.isActive ? (
                              <UserRoundX size={16} />
                            ) : (
                              <UserCheck size={16} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditForm(staff)}
                            title="Edit staff"
                            className="flex size-9 items-center justify-center rounded-lg border border-orange-100 bg-white text-stone-700 transition hover:border-orange-200 hover:text-orange-800"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(staff)}
                            disabled={rowBusy || deleting}
                            title="Delete staff"
                            className="flex size-9 items-center justify-center rounded-lg border border-red-100 bg-white text-red-600 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deleting ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-orange-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-stone-500">
            Showing {formatCount(firstVisible)}-{formatCount(lastVisible)} of{" "}
            {formatCount(pagination.total)}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => dispatch(setPage(page - 1))}
              disabled={loading || !pagination.hasPrevPage}
              title="Previous page"
              className="flex size-10 items-center justify-center rounded-lg border border-orange-100 bg-white text-stone-700 transition hover:border-orange-200 hover:text-orange-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-28 text-center text-sm font-black text-stone-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => dispatch(setPage(page + 1))}
              disabled={loading || !pagination.hasNextPage}
              title="Next page"
              className="flex size-10 items-center justify-center rounded-lg border border-orange-100 bg-white text-stone-700 transition hover:border-orange-200 hover:text-orange-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {showForm ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/50 px-4 py-6">
          <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-orange-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-orange-100 text-orange-800">
                  <UserRoundCog size={20} />
                </span>
                <h2 className="text-xl font-extrabold text-stone-900">
                  {editingStaff ? "Edit Staff" : "Add Staff"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeForm}
                title="Close"
                className="flex size-9 items-center justify-center rounded-lg text-stone-500 transition hover:bg-orange-50 hover:text-stone-900"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 px-5 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="staff-name"
                    className="text-sm font-bold text-stone-800"
                  >
                    Name
                  </label>
                  <input
                    id="staff-name"
                    value={form.userName}
                    onChange={(event) =>
                      updateField("userName", event.target.value)
                    }
                    className="mt-2 h-11 w-full rounded-lg border border-stone-200 px-3 text-sm font-semibold outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="staff-email"
                    className="text-sm font-bold text-stone-800"
                  >
                    Email
                  </label>
                  <input
                    id="staff-email"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    className="mt-2 h-11 w-full rounded-lg border border-stone-200 px-3 text-sm font-semibold outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="staff-phone"
                    className="text-sm font-bold text-stone-800"
                  >
                    Phone
                  </label>
                  <input
                    id="staff-phone"
                    value={form.phoneNumber}
                    onChange={(event) =>
                      updateField("phoneNumber", event.target.value)
                    }
                    className="mt-2 h-11 w-full rounded-lg border border-stone-200 px-3 text-sm font-semibold outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="staff-role"
                    className="text-sm font-bold text-stone-800"
                  >
                    Role
                  </label>
                  <select
                    id="staff-role"
                    value={form.role}
                    onChange={(event) =>
                      updateField("role", event.target.value as StaffRole)
                    }
                    className="mt-2 h-11 w-full rounded-lg border border-stone-200 px-3 text-sm font-semibold outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="staff-password"
                  className="text-sm font-bold text-stone-800"
                >
                  Password
                </label>
                <input
                  id="staff-password"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    updateField("password", event.target.value)
                  }
                  minLength={editingStaff ? undefined : 6}
                  required={!editingStaff}
                  className="mt-2 h-11 w-full rounded-lg border border-stone-200 px-3 text-sm font-semibold outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <label className="flex items-center justify-between gap-4 rounded-lg border border-stone-200 px-4 py-3">
                <span className="block text-sm font-bold text-stone-900">
                  Active
                </span>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    updateField("isActive", event.target.checked)
                  }
                  className="size-5 accent-orange-700"
                />
              </label>

              {formError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {formError}
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-3 border-t border-orange-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  className="h-11 rounded-lg border border-stone-200 px-5 text-sm font-extrabold text-stone-700 transition hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-orange-700 px-5 text-sm font-extrabold text-white transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : null}
                  {editingStaff ? "Save Changes" : "Add Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showDetails ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/50 px-4 py-6">
          <div className="max-h-full w-full max-w-xl overflow-y-auto rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-orange-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-orange-100 text-orange-800">
                  <Eye size={20} />
                </span>
                <h2 className="text-xl font-extrabold text-stone-900">
                  Staff Details
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDetails}
                title="Close"
                className="flex size-9 items-center justify-center rounded-lg text-stone-500 transition hover:bg-orange-50 hover:text-stone-900"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-5">
              {detailsLoading ? (
                <p className="py-8 text-center text-sm font-bold text-stone-500">
                  <Loader2
                    size={18}
                    className="mr-2 inline animate-spin text-orange-700"
                  />
                  Loading staff details...
                </p>
              ) : detailsError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {detailsError}
                </p>
              ) : selectedStaff ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-14 items-center justify-center rounded-lg bg-orange-100 text-lg font-black text-orange-800">
                      {getInitials(selectedStaff.userName)}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-2xl font-black text-stone-900">
                        {selectedStaff.userName}
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-stone-500">
                        {selectedStaff.email}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-orange-100 bg-orange-50 p-4">
                      <p className="text-xs font-black uppercase text-stone-500">
                        Phone
                      </p>
                      <p className="mt-2 text-sm font-extrabold text-stone-900">
                        {selectedStaff.phoneNumber || "Not added"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-orange-100 bg-orange-50 p-4">
                      <p className="text-xs font-black uppercase text-stone-500">
                        Role
                      </p>
                      <p className="mt-2 text-sm font-extrabold text-stone-900">
                        {getRoleLabel(selectedStaff.role)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-orange-100 bg-orange-50 p-4">
                      <p className="text-xs font-black uppercase text-stone-500">
                        Status
                      </p>
                      <p className="mt-2 text-sm font-extrabold text-stone-900">
                        {selectedStaff.isActive ? "Active" : "Inactive"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-orange-100 bg-orange-50 p-4">
                      <p className="text-xs font-black uppercase text-stone-500">
                        Added
                      </p>
                      <p className="mt-2 text-sm font-extrabold text-stone-900">
                        {formatDate(selectedStaff.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-orange-100 pt-5 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeDetails}
                      className="h-11 rounded-lg border border-stone-200 px-5 text-sm font-extrabold text-stone-700 transition hover:bg-stone-50"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        closeDetails();
                        openEditForm(selectedStaff);
                      }}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-orange-700 px-5 text-sm font-extrabold text-white transition hover:bg-orange-800"
                    >
                      <Pencil size={17} />
                      Edit Staff
                    </button>
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-sm font-bold text-stone-500">
                  Staff details unavailable.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default StaffPage;
