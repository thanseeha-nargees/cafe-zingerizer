import type { ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import VerifyOtp from "./features/auth/VerifyOtp";
import Login from "./features/auth/Login";
import Home from "./Home";
import Menu from "./pages/menu";
import ProtectedRoute from "./routes/ProtectedRoute";
import History from "./pages/History";
import Checkout from "./pages/Checkout";
import OrderReadySocket from "./components/OrderReadySocket";

import AdminProtectedRoute from "./admin/routes/AdminProtectedRoute";
import AdminLayout from "./admin/components/AdminLayout";
import AdminLogin from "./admin/pages/Login";
import AdminDashboard from "./admin/pages/Dashboard";
import AdminsPage from "./admin/pages/Admins";
import StaffPage from "./admin/pages/Staff";
import UsersPage from "./admin/pages/Users";
import ProductsPage from "./admin/pages/Products";
import OrdersPage from "./admin/pages/Orders";


import "./assets/i18n";


const protectedPage = (page: ReactNode) => (
  <ProtectedRoute>
    <OrderReadySocket />
    {page}
  </ProtectedRoute>
);

function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <Routes>
        <Route path="/" element={protectedPage(<Home />)} />
        <Route path="/menu" element={protectedPage(<Menu />)} />
        <Route path="/checkout" element={protectedPage(<Checkout />)} />
        <Route path="/history" element={protectedPage(<History />)} />
        <Route path="/otp-verify" element={<VerifyOtp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin Panel routes */}
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="admins" element={<AdminsPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="orders" element={<OrdersPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
