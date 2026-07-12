"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamAdminNotificationsController = exports.getVapidPublicKeyController = exports.unregisterPushSubscriptionController = exports.registerPushSubscriptionController = exports.markAllNotificationsReadController = exports.markNotificationReadController = exports.getAdminNotificationsController = exports.getUnreadNotificationCountController = exports.getNotificationsController = void 0;
const notification_service_js_1 = require("./notification.service.js");
const getPositiveInt = (value, fallback, max = 100) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1)
        return fallback;
    return Math.min(Math.floor(parsed), max);
};
const getStatusFilter = (value) => value === "read" || value === "unread" ? value : "all";
const requireUser = (req, res) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: "Authentication required",
        });
        return null;
    }
    return req.user;
};
const getNotificationsController = async (req, res) => {
    const user = requireUser(req, res);
    if (!user)
        return;
    try {
        const result = await (0, notification_service_js_1.getNotifications)({
            userId: user._id,
            role: user.role,
            page: getPositiveInt(req.query.page, 1),
            limit: getPositiveInt(req.query.limit, 20, 50),
            status: getStatusFilter(req.query.status),
        });
        return res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to load notifications",
        });
    }
};
exports.getNotificationsController = getNotificationsController;
const getUnreadNotificationCountController = async (req, res) => {
    const user = requireUser(req, res);
    if (!user)
        return;
    try {
        const result = await (0, notification_service_js_1.getNotifications)({
            userId: user._id,
            role: user.role,
            page: 1,
            limit: 1,
            status: "all",
        });
        return res.status(200).json({
            success: true,
            unreadCount: result.unreadCount,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to load notification count",
        });
    }
};
exports.getUnreadNotificationCountController = getUnreadNotificationCountController;
const getAdminNotificationsController = async (_req, res) => {
    try {
        const notifications = await (0, notification_service_js_1.getAdminNotifications)();
        return res.status(200).json({
            success: true,
            data: notifications,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to load notifications",
        });
    }
};
exports.getAdminNotificationsController = getAdminNotificationsController;
const markNotificationReadController = async (req, res) => {
    const user = requireUser(req, res);
    if (!user)
        return;
    try {
        const notification = await (0, notification_service_js_1.markNotificationRead)(req.params.notificationId, user._id, user.role);
        return res.status(200).json({
            success: true,
            data: notification,
        });
    }
    catch (error) {
        return res.status(404).json({
            success: false,
            message: error instanceof Error ? error.message : "Notification not found",
        });
    }
};
exports.markNotificationReadController = markNotificationReadController;
const markAllNotificationsReadController = async (req, res) => {
    const user = requireUser(req, res);
    if (!user)
        return;
    try {
        const result = await (0, notification_service_js_1.markAllNotificationsRead)(user._id, user.role);
        return res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to mark notifications read",
        });
    }
};
exports.markAllNotificationsReadController = markAllNotificationsReadController;
const registerPushSubscriptionController = async (req, res) => {
    const user = requireUser(req, res);
    if (!user)
        return;
    const subscription = req.body?.subscription;
    if (!subscription?.endpoint ||
        !subscription?.keys?.p256dh ||
        !subscription?.keys?.auth) {
        return res.status(400).json({
            success: false,
            message: "Invalid push subscription",
        });
    }
    try {
        await (0, notification_service_js_1.registerPushSubscription)(user._id, user.role, subscription, req.headers["user-agent"] || "");
        return res.status(201).json({
            success: true,
            message: "Push notifications enabled",
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to save push subscription",
        });
    }
};
exports.registerPushSubscriptionController = registerPushSubscriptionController;
const unregisterPushSubscriptionController = async (req, res) => {
    const user = requireUser(req, res);
    if (!user)
        return;
    const endpoint = req.body?.endpoint;
    if (!endpoint) {
        return res.status(400).json({
            success: false,
            message: "Push endpoint is required",
        });
    }
    try {
        await (0, notification_service_js_1.unregisterPushSubscription)(user._id, endpoint);
        return res.status(200).json({
            success: true,
            message: "Push subscription removed",
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unable to remove push subscription",
        });
    }
};
exports.unregisterPushSubscriptionController = unregisterPushSubscriptionController;
const getVapidPublicKeyController = (_req, res) => {
    const publicKey = (0, notification_service_js_1.getVapidPublicKey)();
    return res.status(200).json({
        success: true,
        publicKey,
        configured: publicKey.length > 0,
    });
};
exports.getVapidPublicKeyController = getVapidPublicKeyController;
const streamAdminNotificationsController = (_req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    const sendNotification = (notification) => {
        if (notification.role !== "admin")
            return;
        res.write(`event: notification-created\n`);
        res.write(`data: ${JSON.stringify(notification)}\n\n`);
    };
    notification_service_js_1.bookingNotificationEvents.on("notification-created", sendNotification);
    res.write(`event: connected\n`);
    res.write(`data: {"success":true}\n\n`);
    const heartbeat = setInterval(() => {
        res.write(`event: heartbeat\n`);
        res.write(`data: {}\n\n`);
    }, 30000);
    _req.on("close", () => {
        clearInterval(heartbeat);
        notification_service_js_1.bookingNotificationEvents.off("notification-created", sendNotification);
        res.end();
    });
};
exports.streamAdminNotificationsController = streamAdminNotificationsController;
//# sourceMappingURL=notification.controller.js.map