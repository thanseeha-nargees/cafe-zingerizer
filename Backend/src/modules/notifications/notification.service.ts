import { EventEmitter } from "events";
import mongoose, { Types } from "mongoose";
import { User } from "../auth/user.schema.js";
import { broadcastNotification } from "./orderReady.websocket.js";
import { Notification } from "./notification.model.js";
import { PushSubscription } from "./pushSubscription.model.js";

export type NotificationRole = "user" | "admin" | "staff";

export type NotificationPayload = {
  _id: string;
  userId: string | null;
  role: NotificationRole;
  title: string;
  message: string;
  type: string;
  link: string;
  metadata: Record<string, unknown>;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
};

export type BookingNotificationPayload = NotificationPayload & {
  bookingId?: string;
  userName?: string;
  serviceName?: string;
  bookingDateTime?: Date | null;
  bookingStatus?: string;
};

type CreateNotificationInput = {
  userId?: Types.ObjectId | string | null;
  role: NotificationRole;
  title: string;
  message: string;
  type: string;
  link?: string;
  metadata?: Record<string, unknown>;
  bookingId?: Types.ObjectId | string | null;
  userName?: string;
  serviceName?: string;
  bookingStatus?: string;
  bookingDateTime?: Date | null;
};

type CreateBookingNotificationInput = {
  bookingId: Types.ObjectId | string;
  userName: string;
  serviceName: string;
  bookingDateTime: Date;
  bookingStatus: string;
};

type PushSubscriptionInput = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type NotificationQuery = {
  userId: string;
  role: string;
  page?: number;
  limit?: number;
  status?: "all" | "read" | "unread";
};

export const notificationEvents = new EventEmitter();
export const bookingNotificationEvents = notificationEvents;

const getId = (value: unknown) => {
  if (!value) return "";

  if (typeof value === "object" && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }

  return String(value);
};

const toPayload = (notification: any): NotificationPayload => {
  const fallbackTitle = notification.bookingStatus
    ? `Order ${String(notification.bookingStatus).toLowerCase()}`
    : "Notification";
  const fallbackMessage = notification.userName
    ? `${notification.userName} placed a ${notification.serviceName || "cafe"} order.`
    : "You have a new cafe update.";

  return {
    _id: notification._id.toString(),
    userId: notification.userId ? notification.userId.toString() : null,
    role: notification.role || "admin",
    title: notification.title || fallbackTitle,
    message: notification.message || fallbackMessage,
    type: notification.type || "ORDER_CREATED",
    link: notification.link || "",
    metadata: notification.metadata || {},
    isRead: notification.isRead,
    readAt: notification.readAt || null,
    createdAt: notification.createdAt,
  };
};

const getWebPush = async () => {
  try {
    const loader = new Function("specifier", "return import(specifier)") as (
      specifier: string
    ) => Promise<any>;
    const module = await loader("web-push");

    return module.default || module;
  } catch {
    return null;
  }
};

const sendWebPushNotification = async (payload: NotificationPayload) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) return;

  const webPush = await getWebPush();

  if (!webPush) return;

  const query = payload.userId
    ? { userId: payload.userId }
    : { role: payload.role };
  const subscriptions = await PushSubscription.find(query);

  if (subscriptions.length === 0) return;

  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@zingerizer.local",
    publicKey,
    privateKey
  );

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
          },
          JSON.stringify({
            title: payload.title,
            message: payload.message,
            link: payload.link,
            type: payload.type,
            notificationId: payload._id,
          })
        );
      } catch (error: any) {
        if ([404, 410].includes(error?.statusCode)) {
          await PushSubscription.deleteOne({ _id: subscription._id });
        }
      }
    })
  );
};

export const createNotification = async (input: CreateNotificationInput) => {
  const notification = await Notification.create({
    ...input,
    userId: input.userId || null,
    link: input.link || "",
    metadata: input.metadata || {},
    bookingId: input.bookingId || null,
    userName: input.userName || "",
    serviceName: input.serviceName || "",
    bookingStatus: input.bookingStatus || "",
    bookingDateTime: input.bookingDateTime || null,
  });
  const payload = toPayload(notification);

  notificationEvents.emit("notification-created", payload);
  broadcastNotification(payload);
  void sendWebPushNotification(payload);

  return payload;
};

export const createNotificationsForRole = async (
  role: NotificationRole,
  input: Omit<CreateNotificationInput, "role" | "userId">
) => {
  const users = await User.find({ role, isActive: true }).select("_id").lean();

  if (users.length === 0) {
    return [
      await createNotification({
        ...input,
        role,
      }),
    ];
  }

  return Promise.all(
    users.map((user) =>
      createNotification({
        ...input,
        role,
        userId: String(user._id),
      })
    )
  );
};

export const createBookingNotification = async (
  input: CreateBookingNotificationInput
) => {
  const orderId = String(input.bookingId);

  return await createNotificationsForRole("admin", {
    title: "New order received",
    message: `${input.userName} placed a ${input.serviceName} order.`,
    type: "ORDER_CREATED",
    link: "/admin/orders",
    metadata: {
      orderId,
      customerName: input.userName,
      orderType: input.serviceName,
      status: input.bookingStatus,
    },
    bookingId: input.bookingId,
    userName: input.userName,
    serviceName: input.serviceName,
    bookingDateTime: input.bookingDateTime,
    bookingStatus: input.bookingStatus,
  });
};

export const getNotifications = async ({
  userId,
  role,
  page = 1,
  limit = 20,
  status = "all",
}: NotificationQuery) => {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const safePage = Math.max(page, 1);
  const filters: Record<string, unknown> = {
    $or: [{ userId }, { userId: null, role }],
  };

  if (status === "read") {
    filters.isRead = true;
  }

  if (status === "unread") {
    filters.isRead = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filters)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit),
    Notification.countDocuments(filters),
    Notification.countDocuments({ ...filters, isRead: false }),
  ]);

  return {
    notifications: notifications.map(toPayload),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      hasMore: safePage * safeLimit < total,
    },
    unreadCount,
  };
};

export const getAdminNotifications = async () => {
  const notifications = await Notification.find({ role: "admin" })
    .sort({ createdAt: -1 })
    .limit(50);

  return notifications.map(toPayload);
};

export const markNotificationRead = async (
  notificationId: string,
  userId?: string,
  role?: string
) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new Error("Notification not found");
  }

  const filters: Record<string, unknown> = {
    _id: notificationId,
  };

  if (userId && role) {
    filters.$or = [{ userId }, { userId: null, role }];
  }

  const notification = await Notification.findOneAndUpdate(
    filters,
    {
      isRead: true,
      readAt: new Date(),
    },
    { returnDocument: "after" }
  );

  if (!notification) {
    throw new Error("Notification not found");
  }

  return toPayload(notification);
};

export const markAllNotificationsRead = async (userId: string, role: string) => {
  const filters: any = {
    $or: [{ userId }, { userId: null, role }],
    isRead: false,
  };

  await Notification.updateMany(
    filters,
    {
      isRead: true,
      readAt: new Date(),
    }
  );

  return getNotifications({ userId, role, page: 1, limit: 20 });
};

export const registerPushSubscription = async (
  userId: string,
  role: NotificationRole,
  subscription: PushSubscriptionInput,
  userAgent = ""
) => {
  await PushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    {
      userId,
      role,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      userAgent,
    },
    { upsert: true, returnDocument: "after", runValidators: true }
  );
};

export const unregisterPushSubscription = async (
  userId: string,
  endpoint: string
) => {
  await PushSubscription.deleteOne({ userId, endpoint });
};

export const getVapidPublicKey = () => process.env.VAPID_PUBLIC_KEY || "";

export const getOrderNotificationLink = (role: NotificationRole) => {
  if (role === "admin") return "/admin/orders";
  if (role === "staff") return "/staff/orders/active";
  return "/history";
};

export const getStatusTitle = (status: string) => {
  const titles: Record<string, string> = {
    PENDING: "Order pending",
    CONFIRMED: "Order accepted",
    ACCEPTED: "Order accepted",
    PREPARING: "Order preparing",
    READY: "Order ready",
    COMPLETED: "Order served",
    CANCELLED: "Order cancelled",
  };

  return titles[status] || "Order updated";
};

export const describeOrder = (order: any) => {
  const orderId = getId(order._id).slice(-6).toUpperCase();
  const tableNumber =
    order.tableNumber ||
    (typeof order.tableId === "object" && order.tableId?.tableNumber);

  return tableNumber ? `Order #${orderId} for Table ${tableNumber}` : `Order #${orderId}`;
};

const getAssignedStaffId = (order: any) => {
  const assignedStaffId = getId(order.assignedStaff);

  if (assignedStaffId) return assignedStaffId;

  if (
    order.tableId &&
    typeof order.tableId === "object" &&
    "assignedStaff" in order.tableId
  ) {
    return getId(order.tableId.assignedStaff);
  }

  return "";
};

export const createOrderLifecycleNotifications = async (order: any) => {
  const orderId = getId(order._id);
  const customerId = getId(order.userId);
  const assignedStaffId = getAssignedStaffId(order);
  const orderLabel = describeOrder(order);

  const tasks: Promise<unknown>[] = [
    createNotificationsForRole("admin", {
      title: "New order received",
      message: `${orderLabel} has been placed.`,
      type: "ORDER_CREATED",
      link: getOrderNotificationLink("admin"),
      metadata: { orderId, status: order.orderStatus },
    }),
  ];

  if (customerId) {
    tasks.push(
      createNotification({
        userId: customerId,
        role: "user",
        title: "Order placed",
        message: `${orderLabel} was placed successfully.`,
        type: "ORDER_CREATED",
        link: getOrderNotificationLink("user"),
        metadata: { orderId, status: order.orderStatus },
      })
    );
  }

  if (assignedStaffId) {
    tasks.push(
      createNotification({
        userId: assignedStaffId,
        role: "staff",
        title: "New assigned order",
        message: `${orderLabel} is assigned to your table.`,
        type: "STAFF_ASSIGNED_ORDER",
        link: getOrderNotificationLink("staff"),
        metadata: { orderId, status: order.orderStatus },
      })
    );
  }

  if (order.orderType === "Takeaway" && !assignedStaffId) {
    tasks.push(
      createNotificationsForRole("staff", {
        title: "New takeaway order",
        message: `${orderLabel} is waiting to be accepted.`,
        type: "TAKEAWAY_ORDER_UNASSIGNED",
        link: getOrderNotificationLink("staff"),
        metadata: { orderId, status: order.orderStatus },
      })
    );
  }

  await Promise.all(tasks);
};

export const createOrderStatusNotifications = async (
  order: any,
  nextStatus: string,
  previousStatus?: string
) => {
  if (previousStatus === nextStatus) return;

  const orderId = getId(order._id);
  const customerId = getId(order.userId);
  const assignedStaffId = getAssignedStaffId(order);
  const title = getStatusTitle(nextStatus);
  const orderLabel = describeOrder(order);
  const message = `${orderLabel} is now ${nextStatus.toLowerCase()}.`;
  const metadata = { orderId, status: nextStatus, previousStatus };
  const tasks: Promise<unknown>[] = [];

  if (customerId) {
    tasks.push(
      createNotification({
        userId: customerId,
        role: "user",
        title,
        message,
        type: `ORDER_${nextStatus}`,
        link: getOrderNotificationLink("user"),
        metadata,
      })
    );
  }

  if (assignedStaffId) {
    tasks.push(
      createNotification({
        userId: assignedStaffId,
        role: "staff",
        title,
        message,
        type: `ORDER_${nextStatus}`,
        link: getOrderNotificationLink("staff"),
        metadata,
      })
    );
  }

  tasks.push(
    createNotificationsForRole("admin", {
      title,
      message,
      type: `ORDER_${nextStatus}`,
      link: getOrderNotificationLink("admin"),
      metadata,
    })
  );

  await Promise.all(tasks);
};
