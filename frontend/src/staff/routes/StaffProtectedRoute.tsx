import type { ReactNode } from "react";
import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { hydrateAuth } from "../../features/auth/authSlice";

type StaffProtectedRouteProps = {
  children: ReactNode;
};

function StaffProtectedRoute({ children }: StaffProtectedRouteProps) {
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-semibold text-slate-600">
        Checking staff session...
      </div>
    );
  }

  if (status === "unauthenticated" || currentUser?.role !== "staff") {
    return <Navigate to="/staff/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

export default StaffProtectedRoute;
