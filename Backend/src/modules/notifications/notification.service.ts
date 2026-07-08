import { EventEmitter } from "events";
import { Types } from "mongoose";
import { Notification } from "./notification.model.js";

export type BookingNotificationPayload = {
  _id: string;
  bookingId: string;
  userName: string;
  serviceName: string;
  bookingDateTime: Date;
  bookingStatus: string;
  isRead: boolean;
  createdAt: Date;
};

type CreateBookingNotificationInput = {
  bookingId: Types.ObjectId | string;
  userName: string;
  serviceName: string;
  bookingDateTime: Date;
  bookingStatus: string;
};

export const bookingNotificationEvents = new EventEmitter();

const toPayload = (notification: any): BookingNotificationPayload => ({
  _id: notification._id.toString(),
  bookingId: notification.bookingId.toString(),
  userName: notification.userName,
  serviceName: notification.serviceName,
  bookingDateTime: notification.bookingDateTime,
  bookingStatus: notification.bookingStatus,
  isRead: notification.isRead,
  createdAt: notification.createdAt,
});

export const createBookingNotification = async (
  input: CreateBookingNotificationInput
) => {
  const notification = await Notification.create(input);
  const payload = toPayload(notification);

  bookingNotificationEvents.emit("booking-created", payload);

  return payload;
};

export const getAdminNotifications = async () => {
  const notifications = await Notification.find()
    .sort({ createdAt: -1 })
    .limit(50);

  return notifications.map(toPayload);
};

export const markNotificationRead = async (notificationId: string) => {
  const notification = await Notification.findByIdAndUpdate(
    notificationId,
    {
      isRead: true,
      readAt: new Date(),
    },
    { new: true }
  );

  if (!notification) {
    throw new Error("Notification not found");
  }

  return toPayload(notification);
};
