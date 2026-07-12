import { Utensils } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import NotificationBell from "../../components/NotificationBell";
import StaffSidebar, { navItems } from "./StaffSidebar";

function StaffLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="flex min-h-screen">
        <StaffSidebar />
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-teal-700 text-white">
                  <Utensils size={20} />
                </span>
                <span className="text-lg font-extrabold text-slate-950">
                  Staff Portal
                </span>
              </div>
              <NotificationBell accent="teal" />
            </div>
            <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    [
                      "shrink-0 rounded-lg px-3 py-2 text-sm font-bold transition",
                      isActive
                        ? "bg-teal-700 text-white"
                        : "bg-slate-100 text-slate-700",
                    ].join(" ")
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </header>
          <header className="sticky top-0 z-20 hidden items-center justify-end border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:flex lg:px-8">
            <NotificationBell accent="teal" />
          </header>

          <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default StaffLayout;
