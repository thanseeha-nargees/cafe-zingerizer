import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api } from "../../api/axios";

interface Props {
  children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<Props> = ({ children }) => {
  const location = useLocation();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">(
    "checking"
  );

  useEffect(() => {
    let mounted = true;

    api
      .get("/auth/me")
      .then((response) => {
        if (!mounted) return;

        const role = response.data?.user?.role;
        setStatus(role === "admin" ? "allowed" : "denied");
      })
      .catch(() => {
        if (mounted) setStatus("denied");
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-sm text-stone-600">
        Checking admin session...
      </div>
    );
  }

  if (status === "denied") {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
