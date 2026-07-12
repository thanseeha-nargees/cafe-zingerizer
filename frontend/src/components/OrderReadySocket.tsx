import { useEffect } from "react";
import { toast } from "sonner";
import {
  subscribeOrderSocket,
  type OrderEventPayload,
} from "../utils/orderSocket";

type OrderReadyPayload = OrderEventPayload & {
  type: "ORDER_READY";
  orderStatus: "READY";
  message: string;
};

const isOrderReadyPayload = (value: unknown): value is OrderReadyPayload => {
  if (!value || typeof value !== "object") return false;

  const payload = value as Partial<OrderReadyPayload>;

  return payload.type === "ORDER_READY" && payload.orderStatus === "READY";
};

const showOrderReadyNotification = (payload: OrderReadyPayload) => {
  const orderLabel = payload.orderId
    ? `Order #${payload.orderId.slice(-6).toUpperCase()}`
    : undefined;

  toast.success(payload.message || "The food is ready", {
    description: orderLabel,
  });

  if ("Notification" in window && window.Notification.permission === "granted") {
    new window.Notification(payload.message || "The food is ready", {
      body: orderLabel,
    });
  }
};

function OrderReadySocket() {
  useEffect(() => {
    return subscribeOrderSocket((payload) => {
      if (isOrderReadyPayload(payload)) {
        showOrderReadyNotification(payload);
      }
    });
  }, []);

  return null;
}

export default OrderReadySocket;
