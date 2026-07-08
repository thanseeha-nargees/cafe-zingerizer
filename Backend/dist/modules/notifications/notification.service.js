"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markNotificationRead = exports.getAdminNotifications = exports.createBookingNotification = exports.bookingNotificationEvents = void 0;
const events_1 = require("events");
const notification_model_js_1 = require("./notification.model.js");
exports.bookingNotificationEvents = new events_1.EventEmitter();
const toPayload = (notification) => ({
    _id: notification._id.toString(),
    bookingId: notification.bookingId.toString(),
    userName: notification.userName,
    serviceName: notification.serviceName,
    bookingDateTime: notification.bookingDateTime,
    bookingStatus: notification.bookingStatus,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
});
const createBookingNotification = async (input) => {
    const notification = await notification_model_js_1.Notification.create(input);
    const payload = toPayload(notification);
    exports.bookingNotificationEvents.emit("booking-created", payload);
    return payload;
};
exports.createBookingNotification = createBookingNotification;
const getAdminNotifications = async () => {
    const notifications = await notification_model_js_1.Notification.find()
        .sort({ createdAt: -1 })
        .limit(50);
    return notifications.map(toPayload);
};
exports.getAdminNotifications = getAdminNotifications;
const markNotificationRead = async (notificationId) => {
    const notification = await notification_model_js_1.Notification.findByIdAndUpdate(notificationId, {
        isRead: true,
        readAt: new Date(),
    }, { new: true });
    if (!notification) {
        throw new Error("Notification not found");
    }
    return toPayload(notification);
};
exports.markNotificationRead = markNotificationRead;
//# sourceMappingURL=notification.service.js.map