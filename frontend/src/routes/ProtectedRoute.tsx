import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { hydrateAuth } from "../features/auth/authSlice";

interface Props {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.auth.status);

  useEffect(() => {
    if (status === "idle") {
      void dispatch(hydrateAuth());
    }
  }, [dispatch, status]);

  if (status === "idle" || status === "checking") {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-sm text-stone-600">
        Checking session...
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
