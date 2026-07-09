import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { hydrateAuth } from "./authSlice";

type AuthInitializerProps = {
  children: ReactNode;
};

function AuthInitializer({ children }: AuthInitializerProps) {
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.auth.status);

  useEffect(() => {
    if (status === "idle") {
      void dispatch(hydrateAuth());
    }
  }, [dispatch, status]);

  return <>{children}</>;
}

export default AuthInitializer;
