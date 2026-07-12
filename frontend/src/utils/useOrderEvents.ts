import { useEffect } from "react";

type OrderEventPayload = {
  type: "ORDER_CREATED" | "ORDER_STATUS_UPDATED" | "ORDER_READY";
  orderId: string;
  orderStatus?: string;
  assignedStaffId?: string;
  sentAt?: string;
};

const reconnectDelayMs = 3000;

const getOrderSocketUrl = () => {
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

const isOrderEventPayload = (value: unknown): value is OrderEventPayload => {
  if (!value || typeof value !== "object") return false;

  const payload = value as Partial<OrderEventPayload>;

  return (
    payload.type === "ORDER_CREATED" ||
    payload.type === "ORDER_STATUS_UPDATED" ||
    payload.type === "ORDER_READY"
  );
};

export const useOrderEvents = (
  onEvent: (payload: OrderEventPayload) => void,
  enabled = true
) => {
  useEffect(() => {
    if (!enabled) return undefined;

    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let closedByEffect = false;

    const connect = () => {
      socket = new WebSocket(getOrderSocketUrl());

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as unknown;

          if (isOrderEventPayload(payload)) {
            onEvent(payload);
          }
        } catch {
          // Ignore non-JSON socket messages.
        }
      };

      socket.onclose = () => {
        if (closedByEffect) return;

        reconnectTimer = window.setTimeout(connect, reconnectDelayMs);
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
  }, [enabled, onEvent]);
};
