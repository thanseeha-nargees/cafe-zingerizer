import { Request, Response } from "express";
import {
  bookingNotificationEvents,
  BookingNotificationPayload,
  getAdminNotifications,
  markNotificationRead,
} from "./notification.service.js";

export const getAdminNotificationsController = async (
  _req: Request,
  res: Response
) => {
  try {
    const notifications = await getAdminNotifications();

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to load notifications",
    });
  }
};

export const markNotificationReadController = async (
  req: Request<{ notificationId: string }>,
  res: Response
) => {
  try {
    const notification = await markNotificationRead(req.params.notificationId);

    return res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Notification not found",
    });
  }
};

export const streamAdminNotificationsController = (
  _req: Request,
  res: Response
) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendNotification = (notification: BookingNotificationPayload) => {
    res.write(`event: booking-created\n`);
    res.write(`data: ${JSON.stringify(notification)}\n\n`);
  };

  bookingNotificationEvents.on("booking-created", sendNotification);
  res.write(`event: connected\n`);
  res.write(`data: {"success":true}\n\n`);

  const heartbeat = setInterval(() => {
    res.write(`event: heartbeat\n`);
    res.write(`data: {}\n\n`);
  }, 30000);

  _req.on("close", () => {
    clearInterval(heartbeat);
    bookingNotificationEvents.off("booking-created", sendNotification);
    res.end();
  });
};
