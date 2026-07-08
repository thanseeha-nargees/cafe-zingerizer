"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamAdminNotificationsController = exports.markNotificationReadController = exports.getAdminNotificationsController = void 0;
const notification_service_js_1 = require("./notification.service.js");
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
    try {
        const notification = await (0, notification_service_js_1.markNotificationRead)(req.params.notificationId);
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
const streamAdminNotificationsController = (_req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    const sendNotification = (notification) => {
        res.write(`event: booking-created\n`);
        res.write(`data: ${JSON.stringify(notification)}\n\n`);
    };
    notification_service_js_1.bookingNotificationEvents.on("booking-created", sendNotification);
    res.write(`event: connected\n`);
    res.write(`data: {"success":true}\n\n`);
    const heartbeat = setInterval(() => {
        res.write(`event: heartbeat\n`);
        res.write(`data: {}\n\n`);
    }, 30000);
    _req.on("close", () => {
        clearInterval(heartbeat);
        notification_service_js_1.bookingNotificationEvents.off("booking-created", sendNotification);
        res.end();
    });
};
exports.streamAdminNotificationsController = streamAdminNotificationsController;
//# sourceMappingURL=notification.controller.js.map