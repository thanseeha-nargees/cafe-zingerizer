import { Globe2, LogOut, Utensils } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { api } from "../api/axios";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? "cursor-pointer select-none text-orange-700"
    : "cursor-pointer select-none text-stone-700 hover:text-orange-700";

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await api.post("/auth/logout").catch(() => undefined);
    navigate("/login", { replace: true });
  };

  return (
    <nav className="sticky top-0 z-30 flex items-center justify-between border-b border-orange-100 bg-white/95 px-4 py-4 shadow-sm backdrop-blur sm:px-6">
      <NavLink
        to="/"
        className="flex cursor-pointer select-none items-center gap-2 text-lg font-bold text-orange-700"
      >
        <Utensils size={20} />
        <span>Zingerizer</span>
      </NavLink>

      <ul className="flex items-center gap-4 text-sm font-semibold sm:gap-8">
        <li>
          <NavLink to="/" className={navLinkClass}>
            Home
          </NavLink>
        </li>
        <li>
          <NavLink to="/menu" className={navLinkClass}>
            Menu
          </NavLink>
        </li>
        <li>
          <NavLink to="/history" className={navLinkClass}>
            History
          </NavLink>
        </li>
      </ul>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Language"
          className="hidden h-9 w-9 items-center justify-center rounded-full text-stone-700 hover:bg-orange-50 hover:text-orange-700 sm:flex"
        >
          <Globe2 size={18} />
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-orange-700 px-4 text-sm font-semibold text-white transition hover:bg-orange-800"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
