import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import NotificationBell from "../../components/NotificationBell";

function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#fffaf7] text-stone-950">
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex items-center justify-end border-b border-orange-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
            <NotificationBell accent="orange" />
          </header>
          <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
