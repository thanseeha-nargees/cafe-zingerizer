"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrderStatusNotifications = exports.createOrderLifecycleNotifications = exports.describeOrder = exports.getStatusTitle = exports.getOrderNotificationLink = exports.getVapidPublicKey = exports.unregisterPushSubscription = exports.registerPushSubscription = exports.markAllNotificationsRead = exports.markNotificationRead = exports.getAdminNotifications = exports.getNotifications = exports.createBookingNotification = exports.createNotificationsForRole = exports.createNotification = exports.bookingNotificationEvents = exports.notificationEvents = void 0;
const events_1 = require("events");
const mongoose_1 = __importDefault(require("mongoose"));
const user_schema_js_1 = require("../auth/user.schema.js");
const orderReady_websocket_js_1 = require("./orderReady.websocket.js");
const notification_model_js_1 = require("./notification.model.js");
const pushSubscription_model_js_1 = require("./pushSubscription.model.js");
exports.notificationEvents = new events_1.EventEmitter();
exports.bookingNotificationEvents = exports.notificationEvents;
const getId = (value) => {
    if (!value)
        return "";
    if (typeof value === "object" && "_id" in value) {
        return String(value._id);
    }
    return String(value);
};
const toPayload = (notification) => {
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
        const loader = new Function("specifier", "return import(specifier)");
        const module = await loader("web-push");
        return module.default || module;
    }
    catch {
        return null;
    }
};
const sendWebPushNotification = async (payload) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey)
        return;
    const webPush = await getWebPush();
    if (!webPush)
        return;
    const query = payload.userId
        ? { userId: payload.userId }
        : { role: payload.role };
    const subscriptions = await pushSubscription_model_js_1.PushSubscription.find(query);
    if (subscriptions.length === 0)
        return;
    webPush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@zingerizer.local", publicKey, privateKey);
    await Promise.all(subscriptions.map(async (subscription) => {
        try {
            await webPush.sendNotification({
                endpoint: subscription.endpoint,
                keys: subscription.keys,
            }, JSON.stringify({
                title: payload.title,
                message: payload.message,
                link: payload.link,
                type: payload.type,
                notificationId: payload._id,
            }));
        }
        catch (error) {
            if ([404, 410].includes(error?.statusCode)) {
                await pushSubscription_model_js_1.PushSubscription.deleteOne({ _id: subscription._id });
            }
        }
    }));
};
const createNotification = async (input) => {
    const notification = await notification_model_js_1.Notification.create({
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
    exports.notificationEvents.emit("notification-created", payload);
    (0, orderReady_websocket_js_1.broadcastNotification)(payload);
    void sendWebPushNotification(payload);
    return payload;
};
exports.createNotification = createNotification;
const createNotificationsForRole = async (role, input) => {
    const users = await user_schema_js_1.User.find({ role, isActive: true }).select("_id").lean();
    if (users.length === 0) {
        return [
            await (0, exports.createNotification)({
                ...input,
                role,
            }),
        ];
    }
    return Promise.all(users.map((user) => (0, exports.createNotification)({
        ...input,
        role,
        userId: String(user._id),
    })));
};
exports.createNotificationsForRole = createNotificationsForRole;
const createBookingNotification = async (input) => {
    const orderId = String(input.bookingId);
    return await (0, exports.createNotificationsForRole)("admin", {
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
exports.createBookingNotification = createBookingNotification;
const getNotifications = async ({ userId, role, page = 1, limit = 20, status = "all", }) => {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safePage = Math.max(page, 1);
    const filters = {
        $or: [{ userId }, { userId: null, role }],
    };
    if (status === "read") {
        filters.isRead = true;
    }
    if (status === "unread") {
        filters.isRead = false;
    }
    const [notifications, total, unreadCount] = await Promise.all([
        notification_model_js_1.Notification.find(filters)
            .sort({ createdAt: -1 })
            .skip((safePage - 1) * safeLimit)
            .limit(safeLimit),
        notification_model_js_1.Notification.countDocuments(filters),
        notification_model_js_1.Notification.countDocuments({ ...filters, isRead: false }),
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
exports.getNotifications = getNotifications;
const getAdminNotifications = async () => {
    const notifications = await notification_model_js_1.Notification.find({ role: "admin" })
        .sort({ createdAt: -1 })
        .limit(50);
    return notifications.map(toPayload);
};
exports.getAdminNotifications = getAdminNotifications;
const markNotificationRead = async (notificationId, userId, role) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(notificationId)) {
        throw new Error("Notification not found");
    }
    const filters = {
        _id: notificationId,
    };
    if (userId && role) {
        filters.$or = [{ userId }, { userId: null, role }];
    }
    const notification = await notification_model_js_1.Notification.findOneAndUpdate(filters, {
        isRead: true,
        readAt: new Date(),
    }, { new: true });
    if (!notification) {
        throw new Error("Notification not found");
    }
    return toPayload(notification);
};
exports.markNotificationRead = markNotificationRead;
const markAllNotificationsRead = async (userId, role) => {
    const filters = {
        $or: [{ userId }, { userId: null, role }],
        isRead: false,
    };
    await notification_model_js_1.Notification.updateMany(filters, {
        isRead: true,
        readAt: new Date(),
    });
    return (0, exports.getNotifications)({ userId, role, page: 1, limit: 20 });
};
exports.markAllNotificationsRead = markAllNotificationsRead;
const registerPushSubscription = async (userId, role, subscription, userAgent = "") => {
    await pushSubscription_model_js_1.PushSubscription.findOneAndUpdate({ endpoint: subscription.endpoint }, {
        userId,
        role,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent,
    }, { upsert: true, new: true, runValidators: true });
};
exports.registerPushSubscription = registerPushSubscription;
const unregisterPushSubscription = async (userId, endpoint) => {
    await pushSubscription_model_js_1.PushSubscription.deleteOne({ userId, endpoint });
};
exports.unregisterPushSubscription = unregisterPushSubscription;
const getVapidPublicKey = () => process.env.VAPID_PUBLIC_KEY || "";
exports.getVapidPublicKey = getVapidPublicKey;
const getOrderNotificationLink = (role) => {
    if (role === "admin")
        return "/admin/orders";
    if (role === "staff")
        return "/staff/orders/active";
    return "/history";
};
exports.getOrderNotificationLink = getOrderNotificationLink;
const getStatusTitle = (status) => {
    const titles = {
        PENDING: "Order pending",
        CONFIRMED: "Order accepted",
        PREPARING: "Order preparing",
        READY: "Order ready",
        COMPLETED: "Order served",
        CANCELLED: "Order cancelled",
    };
    return titles[status] || "Order updated";
};
exports.getStatusTitle = getStatusTitle;
const describeOrder = (order) => {
    const orderId = getId(order._id).slice(-6).toUpperCase();
    const tableNumber = order.tableNumber ||
        (typeof order.tableId === "object" && order.tableId?.tableNumber);
    return tableNumber ? `Order #${orderId} for Table ${tableNumber}` : `Order #${orderId}`;
};
exports.describeOrder = describeOrder;
const createOrderLifecycleNotifications = async (order) => {
    const orderId = getId(order._id);
    const customerId = getId(order.userId);
    const assignedStaffId = getId(order.assignedStaff);
    const orderLabel = (0, exports.describeOrder)(order);
    const tasks = [
        (0, exports.createNotificationsForRole)("admin", {
            title: "New order received",
            message: `${orderLabel} has been placed.`,
            type: "ORDER_CREATED",
            link: (0, exports.getOrderNotificationLink)("admin"),
            metadata: { orderId, status: order.orderStatus },
        }),
    ];
    if (customerId) {
        tasks.push((0, exports.createNotification)({
            userId: customerId,
            role: "user",
            title: "Order placed",
            message: `${orderLabel} was placed successfully.`,
            type: "ORDER_CREATED",
            link: (0, exports.getOrderNotificationLink)("user"),
            metadata: { orderId, status: order.orderStatus },
        }));
    }
    if (assignedStaffId) {
        tasks.push((0, exports.createNotification)({
            userId: assignedStaffId,
            role: "staff",
            title: "New assigned order",
            message: `${orderLabel} is assigned to your table.`,
            type: "STAFF_ASSIGNED_ORDER",
            link: (0, exports.getOrderNotificationLink)("staff"),
            metadata: { orderId, status: order.orderStatus },
        }));
    }
    await Promise.all(tasks);
};
exports.createOrderLifecycleNotifications = createOrderLifecycleNotifications;
const createOrderStatusNotifications = async (order, nextStatus, previousStatus) => {
    if (previousStatus === nextStatus)
        return;
    const orderId = getId(order._id);
    const customerId = getId(order.userId);
    const assignedStaffId = getId(order.assignedStaff);
    const title = (0, exports.getStatusTitle)(nextStatus);
    const orderLabel = (0, exports.describeOrder)(order);
    const message = `${orderLabel} is now ${nextStatus.toLowerCase()}.`;
    const tasks = [];
    if (customerId) {
        tasks.push((0, exports.createNotification)({
            userId: customerId,
            role: "user",
            title,
            message,
            type: `ORDER_${nextStatus}`,
            link: (0, exports.getOrderNotificationLink)("user"),
            metadata: { orderId, status: nextStatus },
        }));
    }
    if (assignedStaffId) {
        tasks.push((0, exports.createNotification)({
            userId: assignedStaffId,
            role: "staff",
            title,
            message,
            type: `ORDER_${nextStatus}`,
            link: (0, exports.getOrderNotificationLink)("staff"),
            metadata: { orderId, status: nextStatus },
        }));
    }
    tasks.push((0, exports.createNotificationsForRole)("admin", {
        title,
        message,
        type: `ORDER_${nextStatus}`,
        link: (0, exports.getOrderNotificationLink)("admin"),
        metadata: { orderId, status: nextStatus },
    }));
    await Promise.all(tasks);
};
exports.createOrderStatusNotifications = createOrderStatusNotifications;
//# sourceMappingURL=notification.service.js.map