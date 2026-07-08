import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  CheckCircle2,
  Loader2,
  Mail,
  Pencil,
  RefreshCw,
  Search,
  UserCheck,
  UserRoundX,
  UsersRound,
  X,
} from "lucide-react";
import { api } from "../../api/axios";

type AdminUser = {
  _id: string;
  userName: string;
  email: string;
  profileImage?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt?: string | null;
};

type UserSummary = {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
};

type StatusFilter = "all" | "active" | "inactive";

type UserForm = {
  userName: string;
  isActive: boolean;
};

const emptySummary: UserSummary = {
  totalUsers: 0,
  activeUsers: 0,
  inactiveUsers: 0,
};

const formatCount = (value: number) =>
  new Intl.NumberFormat("en-IN").format(value || 0);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDate = (dateValue?: string | null) => {
  if (!dateValue) return "No orders yet";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(dateValue));
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

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

function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [summary, setSummary] = useState<UserSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [savingForm, setSavingForm] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<UserForm>({
    userName: "",
    isActive: true,
  });

  const loadUsers = async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }
    setError("");

    try {
      const response = await api.get<{
        users: AdminUser[];
        summary: UserSummary;
      }>("/admin/users");

      setUsers(response.data.users || []);
      setSummary(response.data.summary || emptySummary);
    } catch (loadError) {
      setError(getApiMessage(loadError, "Failed to load users"));
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return users.filter((user) => {
      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "active" && user.isActive) ||
        (statusFilter === "inactive" && !user.isActive);
      const searchMatch =
        !term ||
        user.userName.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term);

      return statusMatch && searchMatch;
    });
  }, [search, statusFilter, users]);

  const openEditForm = (user: AdminUser) => {
    setEditingUser(user);
    setForm({
      userName: user.userName,
      isActive: user.isActive,
    });
    setError("");
    setNotice("");
  };

  const closeForm = () => {
    setEditingUser(null);
    setForm({
      userName: "",
      isActive: true,
    });
  };

  const mergeUpdatedUser = (updatedUser: AdminUser) => {
    setUsers((current) =>
      current.map((user) =>
        user._id === updatedUser._id
          ? {
              ...user,
              ...updatedUser,
              orderCount: user.orderCount,
              totalSpent: user.totalSpent,
              lastOrderAt: user.lastOrderAt,
            }
          : user
      )
    );
  };

  const handleQuickUpdate = async (
    user: AdminUser,
    changes: Partial<UserForm>
  ) => {
    setSavingId(user._id);
    setError("");
    setNotice("");

    try {
      const response = await api.patch<{ user: AdminUser }>(
        `/admin/users/${user._id}`,
        changes
      );
      mergeUpdatedUser(response.data.user);
      await loadUsers(false);
      setNotice(`${user.userName} updated.`);
    } catch (saveError) {
      setError(getApiMessage(saveError, "Unable to update user"));
    } finally {
      setSavingId("");
    }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingUser) return;

    if (form.userName.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    setSavingForm(true);
    setError("");
    setNotice("");

    try {
      const response = await api.patch<{ user: AdminUser }>(
        `/admin/users/${editingUser._id}`,
        {
          userName: form.userName.trim(),
          isActive: form.isActive,
        }
      );

      mergeUpdatedUser(response.data.user);
      await loadUsers(false);
      setNotice(`${response.data.user.userName} updated.`);
      closeForm();
    } catch (saveError) {
      setError(getApiMessage(saveError, "Unable to save user"));
    } finally {
      setSavingForm(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-wide text-orange-700">
            Customer Access
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Users
          </h1>
        </div>

        <button
          type="button"
          onClick={() => loadUsers()}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-orange-100 bg-white px-4 text-sm font-bold text-stone-800 shadow-sm transition hover:border-orange-200 hover:text-orange-800"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-orange-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-stone-500">
            Total
          </p>
          <p className="mt-2 text-3xl font-black text-stone-900">
            {loading ? "..." : formatCount(summary.totalUsers)}
          </p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
            Active
          </p>
          <p className="mt-2 text-3xl font-black text-emerald-900">
            {loading ? "..." : formatCount(summary.activeUsers)}
          </p>
        </div>
        <div className="rounded-lg border border-red-100 bg-red-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-red-700">
            Inactive
          </p>
          <p className="mt-2 text-3xl font-black text-red-900">
            {loading ? "..." : formatCount(summary.inactiveUsers)}
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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search users"
              className="w-full bg-transparent text-sm font-semibold text-stone-900 outline-none placeholder:text-stone-400"
            />
          </label>

          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-orange-100 bg-orange-50">
            {(["all", "active", "inactive"] as StatusFilter[]).map(
              (filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatusFilter(filter)}
                  className={[
                    "h-11 px-3 text-sm font-extrabold capitalize transition",
                    statusFilter === filter
                      ? "bg-stone-950 text-white"
                      : "text-stone-700 hover:bg-white",
                  ].join(" ")}
                >
                  {filter}
                </button>
              )
            )}
          </div>

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
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-stone-500">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-stone-500">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-stone-500">
                  Orders
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
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm font-bold text-stone-500"
                  >
                    <Loader2
                      size={18}
                      className="mr-2 inline animate-spin text-orange-700"
                    />
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm font-bold text-stone-500"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const busy = savingId === user._id;

                  return (
                    <tr key={user._id} className="align-middle">
                      <td className="px-4 py-4">
                        <div className="flex min-w-60 items-center gap-3">
                          {user.profileImage ? (
                            <img
                              src={user.profileImage}
                              alt={user.userName}
                              className="size-12 rounded-lg object-cover"
                            />
                          ) : (
                            <span className="flex size-12 items-center justify-center rounded-lg bg-orange-100 text-sm font-black text-orange-800">
                              {getInitials(user.userName)}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-extrabold text-stone-900">
                              {user.userName}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-stone-500">
                              Joined {formatDate(user.createdAt)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="min-w-60 text-sm font-semibold text-stone-600">
                          <p className="flex items-center gap-2">
                            <Mail size={14} className="text-orange-700" />
                            <span className="break-all">{user.email}</span>
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="min-w-40">
                          <p className="text-sm font-black text-stone-900">
                            {formatCount(user.orderCount)} orders
                          </p>
                          <p className="mt-1 text-xs font-semibold text-stone-500">
                            {formatCurrency(user.totalSpent)}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-stone-500">
                            Last: {formatDate(user.lastOrderAt)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex min-w-40 flex-wrap gap-2">
                          <span
                            className={[
                              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black uppercase ring-1",
                              user.isActive
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : "bg-red-50 text-red-700 ring-red-200",
                            ].join(" ")}
                          >
                            {user.isActive ? (
                              <UserCheck size={13} />
                            ) : (
                              <UserRoundX size={13} />
                            )}
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickUpdate(user, {
                                isActive: !user.isActive,
                              })
                            }
                            disabled={busy}
                            title={user.isActive ? "Deactivate" : "Activate"}
                            className="flex size-9 items-center justify-center rounded-lg border border-orange-100 bg-white text-stone-700 transition hover:border-orange-200 hover:text-orange-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busy ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : user.isActive ? (
                              <UserRoundX size={16} />
                            ) : (
                              <UserCheck size={16} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditForm(user)}
                            title="Edit user"
                            className="flex size-9 items-center justify-center rounded-lg border border-orange-100 bg-white text-stone-700 transition hover:border-orange-200 hover:text-orange-800"
                          >
                            <Pencil size={16} />
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
      </section>

      {editingUser ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/50 px-4 py-6">
          <div className="max-h-full w-full max-w-xl overflow-y-auto rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-orange-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-orange-100 text-orange-800">
                  <UsersRound size={20} />
                </span>
                <h2 className="text-xl font-extrabold text-stone-900">
                  Edit User
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
              <div>
                <label
                  htmlFor="user-name"
                  className="text-sm font-bold text-stone-800"
                >
                  Name
                </label>
                <input
                  id="user-name"
                  value={form.userName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      userName: event.target.value,
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-lg border border-stone-200 px-3 text-sm font-semibold outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="user-email"
                  className="text-sm font-bold text-stone-800"
                >
                  Email
                </label>
                <input
                  id="user-email"
                  value={editingUser.email}
                  disabled
                  className="mt-2 h-11 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm font-semibold text-stone-500 outline-none"
                />
              </div>

              <div>
                <label className="flex items-center justify-between gap-4 rounded-lg border border-stone-200 px-4 py-3">
                  <span>
                    <span className="block text-sm font-bold text-stone-900">
                      Active
                    </span>
                    <span className="block text-xs font-semibold text-stone-500">
                      Can sign in and place orders
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                    className="size-5 accent-orange-700"
                  />
                </label>
              </div>

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
                  disabled={savingForm}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-orange-700 px-5 text-sm font-extrabold text-white transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingForm ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : null}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default UsersPage;
