import crypto from "crypto";
import type { IncomingMessage, Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import type { Duplex } from "stream";
import { User } from "../auth/user.schema.js";
import type { AuthUser } from "../auth/user.model.js";

const ORDER_READY_WS_PATH = "/ws/orders";
const WS_ACCEPT_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

type OrderReadySource = {
  _id: unknown;
  userId?: unknown;
  customerName?: string;
};

type OrderEventSource = {
  _id: unknown;
  userId?: unknown;
  tableId?: unknown;
  assignedStaff?: unknown;
  orderStatus?: string;
  customerName?: string;
};

type OrderReadyPayload = {
  type: "ORDER_READY";
  orderId: string;
  orderStatus: "READY";
  message: string;
  customerName?: string;
  sentAt: string;
};

type OrderEventPayload = {
  type: "ORDER_CREATED" | "ORDER_STATUS_UPDATED";
  orderId: string;
  userId?: string;
  orderStatus?: string;
  customerName?: string;
  tableId?: string;
  assignedStaffId?: string;
  sentAt: string;
};

type NotificationEventPayload = {
  type: "NOTIFICATION_CREATED";
  notification: {
    _id: string;
    userId: string | null;
    role: string;
    title: string;
    message: string;
    type: string;
    link: string;
    metadata: Record<string, unknown>;
    isRead: boolean;
    readAt: Date | null;
    createdAt: Date;
  };
  unreadDelta: number;
  sentAt: string;
};

const clientsByUserId = new Map<string, Set<Duplex>>();
const clientsByRole = new Map<string, Set<Duplex>>();
let initialized = false;

const getId = (value: unknown) => {
  if (!value) return "";

  if (typeof value === "object" && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }

  return String(value);
};

const parseCookies = (cookieHeader: string | undefined) => {
  const cookies = new Map<string, string>();

  if (!cookieHeader) return cookies;

  for (const cookie of cookieHeader.split(";")) {
    const separatorIndex = cookie.indexOf("=");

    if (separatorIndex === -1) continue;

    const key = cookie.slice(0, separatorIndex).trim();
    const value = cookie.slice(separatorIndex + 1).trim();

    cookies.set(key, decodeURIComponent(value));
  }

  return cookies;
};

const rejectSocket = (socket: Duplex, statusCode: number, message: string) => {
  socket.write(
    `HTTP/1.1 ${statusCode} ${message}\r\nConnection: close\r\n\r\n`
  );
  socket.destroy();
};

const isAllowedOrigin = (origin: string | undefined) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  if (!origin || origin === frontendUrl) return true;
  if (process.env.NODE_ENV === "production") return false;

  try {
    const originUrl = new URL(origin);

    return ["localhost", "127.0.0.1", "::1"].includes(originUrl.hostname);
  } catch {
    return false;
  }
};

const authenticateRequest = async (request: IncomingMessage) => {
  const token = parseCookies(request.headers.cookie).get("accessToken");
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

  if (!token || !secret) return null;

  const decoded = jwt.verify(token, secret) as AuthUser;
  const user = await User.findById(decoded.userId)
    .select("_id role isActive")
    .lean();

  if (!user?.isActive) return null;

  return {
    userId: String(user._id),
    role: user.role,
  };
};

const encodeFrame = (payload: string | Buffer, opcode = 0x1) => {
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  let header: Buffer;

  if (data.length < 126) {
    header = Buffer.alloc(2);
    header[1] = data.length;
  } else if (data.length <= 65535) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(data.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(data.length), 2);
  }

  header[0] = 0x80 | opcode;

  return Buffer.concat([header, data]);
};

const addClient = (userId: string, role: string, socket: Duplex) => {
  const clients = clientsByUserId.get(userId) ?? new Set<Duplex>();
  clients.add(socket);
  clientsByUserId.set(userId, clients);

  const roleClients = clientsByRole.get(role) ?? new Set<Duplex>();
  roleClients.add(socket);
  clientsByRole.set(role, roleClients);

  const cleanup = () => {
    clients.delete(socket);

    if (clients.size === 0) {
      clientsByUserId.delete(userId);
    }

    roleClients.delete(socket);

    if (roleClients.size === 0) {
      clientsByRole.delete(role);
    }
  };

  socket.on("close", cleanup);
  socket.on("end", cleanup);
  socket.on("error", cleanup);
  socket.on("data", (chunk: Buffer) => {
    const opcode = chunk[0] & 0x0f;

    if (opcode === 0x8) {
      socket.end(encodeFrame(Buffer.alloc(0), 0x8));
    }

    if (opcode === 0x9) {
      socket.write(encodeFrame(Buffer.alloc(0), 0xa));
    }
  });
};

const handleUpgrade = async (request: IncomingMessage, socket: Duplex) => {
  const requestUrl = new URL(
    request.url || "",
    `http://${request.headers.host || "localhost"}`
  );

  if (requestUrl.pathname !== ORDER_READY_WS_PATH) {
    return;
  }

  if (!isAllowedOrigin(request.headers.origin)) {
    rejectSocket(socket, 403, "Forbidden");
    return;
  }

  const upgradeHeader = request.headers.upgrade;
  const websocketKey = request.headers["sec-websocket-key"];

  if (
    upgradeHeader?.toLowerCase() !== "websocket" ||
    typeof websocketKey !== "string"
  ) {
    rejectSocket(socket, 400, "Bad Request");
    return;
  }

  try {
    const auth = await authenticateRequest(request);

    if (!auth) {
      rejectSocket(socket, 401, "Unauthorized");
      return;
    }

    const acceptKey = crypto
      .createHash("sha1")
      .update(`${websocketKey}${WS_ACCEPT_GUID}`)
      .digest("base64");

    socket.write(
      [
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Accept: ${acceptKey}`,
        "",
        "",
      ].join("\r\n")
    );

    addClient(auth.userId, auth.role, socket);
  } catch {
    rejectSocket(socket, 401, "Unauthorized");
  }
};

export const initializeOrderReadyWebSocket = (server: HttpServer) => {
  if (initialized) return;

  initialized = true;
  server.on("upgrade", (request, socket) => {
    void handleUpgrade(request, socket);
  });
};

export const notifyOrderReady = (order: OrderReadySource) => {
  const userId = getId(order.userId);
  const clients = clientsByUserId.get(userId);

  if (!clients || clients.size === 0) return;

  const payload: OrderReadyPayload = {
    type: "ORDER_READY",
    orderId: getId(order._id),
    orderStatus: "READY",
    message: "The food is ready",
    customerName: order.customerName,
    sentAt: new Date().toISOString(),
  };
  const frame = encodeFrame(JSON.stringify(payload));

  for (const client of clients) {
    if (client.writable) {
      client.write(frame);
    }
  }
};

const writePayload = (
  clients: Set<Duplex> | undefined,
  payload: OrderEventPayload | NotificationEventPayload
) => {
  if (!clients || clients.size === 0) return;

  const frame = encodeFrame(JSON.stringify(payload));

  for (const client of clients) {
    if (client.writable) {
      client.write(frame);
    }
  }
};

const getAssignedStaffId = (order: OrderEventSource) => {
  const assignedStaffId = getId(order.assignedStaff);

  if (assignedStaffId) return assignedStaffId;

  if (
    order.tableId &&
    typeof order.tableId === "object" &&
    "assignedStaff" in order.tableId
  ) {
    return getId((order.tableId as { assignedStaff?: unknown }).assignedStaff);
  }

  return "";
};

const notifyOrderEvent = (
  order: OrderEventSource,
  type: OrderEventPayload["type"]
) => {
  const userId = getId(order.userId);
  const assignedStaffId = getAssignedStaffId(order);
  const payload: OrderEventPayload = {
    type,
    orderId: getId(order._id),
    userId,
    orderStatus: order.orderStatus,
    customerName: order.customerName,
    tableId: getId(order.tableId),
    assignedStaffId,
    sentAt: new Date().toISOString(),
  };

  writePayload(clientsByRole.get("admin"), payload);

  if (userId) {
    writePayload(clientsByUserId.get(userId), payload);
  }

  if (assignedStaffId) {
    writePayload(clientsByUserId.get(assignedStaffId), payload);
  }
};

export const notifyOrderCreated = (order: OrderEventSource) => {
  notifyOrderEvent(order, "ORDER_CREATED");
};

export const notifyOrderStatusUpdated = (order: OrderEventSource) => {
  notifyOrderEvent(order, "ORDER_STATUS_UPDATED");
};

export const broadcastNotification = (
  notification: NotificationEventPayload["notification"]
) => {
  const payload: NotificationEventPayload = {
    type: "NOTIFICATION_CREATED",
    notification,
    unreadDelta: notification.isRead ? 0 : 1,
    sentAt: new Date().toISOString(),
  };

  if (notification.userId) {
    writePayload(clientsByUserId.get(notification.userId), payload);
    return;
  }

  writePayload(clientsByRole.get(notification.role), payload);
};
