import { Menu, Search, UserRound } from "lucide-react";
import { NavLink } from "react-router-dom";

const tabs = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Products", href: "/admin/products" },
  { label: "Staff", href: "/admin/staff" },
];

function AdminNavbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-orange-100 bg-[#fffaf7]/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <button
          type="button"
          aria-label="Open menu"
          className="flex size-10 items-center justify-center rounded-full border border-orange-100 bg-white text-stone-700 shadow-sm lg:hidden"
        >
          <Menu size={20} />
        </button>

        <nav className="hidden h-full items-center gap-7 text-sm font-bold text-stone-600 md:flex">
          {tabs.map((tab) => (
            <NavLink
              key={tab.href}
              to={tab.href}
              className={({ isActive }) =>
                [
                  "relative flex h-full items-center transition hover:text-orange-800",
                  isActive ? "text-orange-800" : "",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <span>{tab.label}</span>
                  {isActive ? (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-orange-600" />
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            aria-label="Search"
            className="hidden size-10 items-center justify-center rounded-full border border-orange-100 bg-white text-stone-600 shadow-sm sm:flex"
          >
            <Search size={18} />
          </button>
          <div className="flex size-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f8b66d,#6f3f2a)] text-white shadow-sm shadow-orange-900/20">
            <UserRound size={20} />
          </div>
        </div>
      </div>
    </header>
  );
}

export default AdminNavbar;
