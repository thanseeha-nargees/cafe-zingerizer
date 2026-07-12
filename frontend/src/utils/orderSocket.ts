export type OrderEventPayload = {
  type: "ORDER_CREATED" | "ORDER_STATUS_UPDATED" | "ORDER_READY";
  orderId: string;
  userId?: string;
  orderStatus?: string;
  message?: string;
  customerName?: string;
  tableId?: string;
  assignedStaffId?: string;
  sentAt?: string;
};

export type NotificationSocketPayload = {
  type: "NOTIFICATION_CREATED";
  notification: unknown;
  unreadDelta?: number;
  sentAt?: string;
};

export type OrderSocketPayload = OrderEventPayload | NotificationSocketPayload;

type OrderSocketListener = (payload: OrderSocketPayload) => void;

const reconnectDelayMs = 3000;
const listeners = new Set<OrderSocketListener>();

let socket: WebSocket | null = null;
let reconnectTimer: number | undefined;
let shouldReconnect = false;

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

const clearReconnectTimer = () => {
  if (!reconnectTimer) return;

  window.clearTimeout(reconnectTimer);
  reconnectTimer = undefined;
};

const dispatchPayload = (payload: OrderSocketPayload) => {
  for (const listener of Array.from(listeners)) {
    try {
      listener(payload);
    } catch {
      // Keep one consumer from breaking the shared stream for the rest.
    }
  }
};

const scheduleReconnect = () => {
  if (!shouldReconnect || listeners.size === 0 || reconnectTimer) return;

  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = undefined;
    connect();
  }, reconnectDelayMs);
};

const connect = () => {
  if (
    socket &&
    (socket.readyState === WebSocket.CONNECTING ||
      socket.readyState === WebSocket.OPEN)
  ) {
    return;
  }

  try {
    socket = new WebSocket(getOrderSocketUrl());
  } catch {
    socket = null;
    scheduleReconnect();
    return;
  }

  socket.onmessage = (event) => {
    try {
      dispatchPayload(JSON.parse(event.data) as OrderSocketPayload);
    } catch {
      // Ignore non-JSON socket messages.
    }
  };

  socket.onclose = () => {
    socket = null;
    scheduleReconnect();
  };

  socket.onerror = () => {
    socket?.close();
  };
};

export const subscribeOrderSocket = (listener: OrderSocketListener) => {
  listeners.add(listener);
  shouldReconnect = true;
  clearReconnectTimer();
  connect();

  return () => {
    listeners.delete(listener);

    if (listeners.size > 0) return;

    shouldReconnect = false;
    clearReconnectTimer();
    socket?.close();
    socket = null;
  };
};
