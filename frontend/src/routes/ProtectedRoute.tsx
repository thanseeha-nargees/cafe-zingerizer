import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api/axios";

interface Props {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">(
    "checking"
  );

  useEffect(() => {
    let mounted = true;

    api
      .get("/auth/me")
      .then(() => {
        if (mounted) setStatus("allowed");
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
        Checking session...
      </div>
    );
  }

  if (status === "denied") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
