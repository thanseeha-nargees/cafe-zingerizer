import {
  Boxes,
  BriefcaseBusiness,
  LayoutDashboard,
  Loader2,
  LogOut,
  ShoppingBag,
  UsersRound,
  Utensils,
} from "lucide-react";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { api } from "../../api/axios";
import { useAppDispatch } from "../../app/hooks";
import { clearCurrentUser } from "../../features/auth/authSlice";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Boxes },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Users", href: "/admin/users", icon: UsersRound },
  { label: "Staff", href: "/admin/staff", icon: BriefcaseBusiness },
];

function AdminSidebar() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    await api.post("/auth/logout").catch(() => undefined);
    dispatch(clearCurrentUser());
    navigate("/admin/login", { replace: true });
  };

  return (
    <aside className="hidden w-64 shrink-0 border-r border-orange-100 bg-[#fff5f0] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto">
      <div className="px-6 py-7">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-orange-700 text-white shadow-sm shadow-orange-900/20">
          <Utensils size={28} strokeWidth={2.4} />
        </div>
        <div className="mt-5">
          <p className="text-2xl font-extrabold tracking-tight text-orange-800">
            Admin Panel
          </p>
          <p className="mt-1 text-sm font-medium text-stone-500">
            Zingerizer Manager
          </p>
        </div>
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-2 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                [
                  "flex h-12 items-center gap-3 rounded-2xl px-4 text-sm font-bold transition",
                  isActive
                    ? "bg-orange-700 text-white shadow-sm shadow-orange-900/20"
                    : "text-stone-600 hover:bg-white hover:text-orange-800",
                ].join(" ")
              }
            >
              <Icon size={19} strokeWidth={2.4} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-orange-100 px-3 py-5">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-sm font-bold text-red-500 transition hover:bg-white"
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

export default AdminSidebar;
