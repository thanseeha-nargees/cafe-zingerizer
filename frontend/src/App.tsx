import type { ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import VerifyOtp from "./features/auth/VerifyOtp";
import Login from "./features/auth/Login";
import Home from "./Home";
import Menu from "./pages/menu";
import ProtectedRoute from "./routes/ProtectedRoute";
import History from "./pages/History";
import Checkout from "./pages/Checkout";

const protectedPage = (page: ReactNode) => (
  <ProtectedRoute>{page}</ProtectedRoute>
);

function App() {
  return (
    <Routes>
      <Route path="/" element={protectedPage(<Home />)} />
      <Route path="/menu" element={protectedPage(<Menu />)} />
      <Route path="/checkout" element={protectedPage(<Checkout />)} />
      <Route path="/history" element={protectedPage(<History />)} />
      <Route path="/otp-verify" element={<VerifyOtp />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}

export default App;
