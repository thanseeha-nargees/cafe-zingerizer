import { useEffect } from "react";
import { toast } from "sonner";

type OrderReadyPayload = {
  type: "ORDER_READY";
  orderId: string;
  orderStatus: "READY";
  message: string;
  sentAt: string;
};

const RECONNECT_DELAY_MS = 3000;

const getOrderReadySocketUrl = () => {
  const configuredUrl = import.meta.env.VITE_ORDER_SOCKET_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const url = new URL(apiUrl, window.location.origin);
  const basePath = url.pathname.replace(/\/api\/?$/, "");

  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${basePath}/ws/orders`.replace(/\/{2,}/g, "/");
  url.search = "";
  url.hash = "";

  return url.toString();
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
    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let closedByEffect = false;

    const connect = () => {
      socket = new WebSocket(getOrderReadySocketUrl());

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as unknown;

          if (isOrderReadyPayload(payload)) {
            showOrderReadyNotification(payload);
          }
        } catch {
          // Ignore non-JSON socket messages
        }
      };

      socket.onclose = () => {
        if (closedByEffect) return;

        reconnectTimer = window.setTimeout(connect, RECONNECT_DELAY_MS);
      };
    };

    connect();

    return () => {
      closedByEffect = true;

      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }

      socket?.close();
    };
  }, []);

  return null;
}

export default OrderReadySocket;
