import { useEffect } from "react";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { saveQrTableSession } from "../utils/qrTableSession";

type QrTableSessionRouteProps = {
  children: ReactNode;
};

function QrTableSessionRoute({ children }: QrTableSessionRouteProps) {
  const { tableId } = useParams();

  useEffect(() => {
    if (tableId) {
      saveQrTableSession(tableId);
    }
  }, [tableId]);

  return <>{children}</>;
}

export default QrTableSessionRoute;
