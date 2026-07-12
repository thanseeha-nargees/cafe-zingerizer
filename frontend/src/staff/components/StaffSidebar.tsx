import {
  ClipboardList,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  Table2,
  Utensils,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { api } from "../../api/axios";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { clearCurrentUser } from "../../features/auth/authSlice";

const navItems = [
  { label: "Dashboard", href: "/staff/dashboard", icon: LayoutDashboard },
  { label: "My Orders", href: "/staff/orders/active", icon: ClipboardList },
  { label: "Order History", href: "/staff/orders/history", icon: History },
  { label: "My Tables", href: "/staff/tables", icon: Table2 },
  { label: "Profile", href: "/staff/profile", icon: UserRound },
];

function StaffSidebar() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.currentUser);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    await api.post("/auth/logout").catch(() => undefined);
    dispatch(clearCurrentUser());
    navigate("/staff/login", { replace: true });
  };

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto">
      <div className="px-6 py-7">
        <div className="flex size-14 items-center justify-center rounded-lg bg-teal-700 text-white shadow-sm">
          <Utensils size={27} strokeWidth={2.4} />
        </div>
        <div className="mt-5">
          <p className="text-2xl font-extrabold tracking-tight text-slate-950">
            Staff Portal
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-500">
            {currentUser?.userName || "Service team"}
          </p>
        </div>
      </div>

      <nav className="mt-4 flex flex-1 flex-col gap-2 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                [
                  "flex h-12 items-center gap-3 rounded-lg px-4 text-sm font-bold transition",
                  isActive
                    ? "bg-teal-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-teal-800",
                ].join(" ")
              }
            >
              <Icon size={19} strokeWidth={2.4} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-3 py-5">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex h-12 w-full items-center gap-3 rounded-lg px-4 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loggingOut ? (
            <Loader2 size={19} className="animate-spin" strokeWidth={2.4} />
          ) : (
            <LogOut size={19} strokeWidth={2.4} />
          )}
          <span>{loggingOut ? "Logging out" : "Logout"}</span>
        </button>
      </div>
    </aside>
  );
}

export { navItems };
export default StaffSidebar;
