import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { hydrateAuth } from "../../features/auth/authSlice";

interface Props {
  children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<Props> = ({ children }) => {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { currentUser, status } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (status === "idle") {
      void dispatch(hydrateAuth());
    }
  }, [dispatch, status]);

  if (status === "idle" || status === "checking") {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-sm text-stone-600">
        Checking admin session...
      </div>
    );
  }

  if (status === "unauthenticated" || currentUser?.role !== "admin") {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
