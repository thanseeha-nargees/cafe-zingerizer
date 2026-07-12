import { Request, Response } from "express";
import {
  bookingNotificationEvents,
  getAdminNotifications,
  getNotifications,
  getVapidPublicKey,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationPayload,
  registerPushSubscription,
  unregisterPushSubscription,
} from "./notification.service.js";

const getPositiveInt = (value: unknown, fallback: number, max = 100) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) return fallback;

  return Math.min(Math.floor(parsed), max);
};

const getStatusFilter = (value: unknown) =>
  value === "read" || value === "unread" ? value : "all";

const requireUser = (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return null;
  }

  return req.user;
};

export const getNotificationsController = async (
  req: Request,
  res: Response
) => {
  const user = requireUser(req, res);

  if (!user) return;

  try {
    const result = await getNotifications({
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

export const getUnreadNotificationCountController = async (
  req: Request,
  res: Response
) => {
  const user = requireUser(req, res);

  if (!user) return;

  try {
    const result = await getNotifications({
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
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to load notification count",
    });
  }
};

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
  const user = requireUser(req, res);

  if (!user) return;

  try {
    const notification = await markNotificationRead(
      req.params.notificationId,
      user._id,
      user.role
    );

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

export const markAllNotificationsReadController = async (
  req: Request,
  res: Response
) => {
  const user = requireUser(req, res);

  if (!user) return;

  try {
    const result = await markAllNotificationsRead(user._id, user.role);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to mark notifications read",
    });
  }
};

export const registerPushSubscriptionController = async (
  req: Request,
  res: Response
) => {
  const user = requireUser(req, res);

  if (!user) return;

  const subscription = req.body?.subscription;

  if (
    !subscription?.endpoint ||
    !subscription?.keys?.p256dh ||
    !subscription?.keys?.auth
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid push subscription",
    });
  }

  try {
    await registerPushSubscription(
      user._id,
      user.role as "user" | "admin" | "staff",
      subscription,
      req.headers["user-agent"] || ""
    );

    return res.status(201).json({
      success: true,
      message: "Push notifications enabled",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to save push subscription",
    });
  }
};

export const unregisterPushSubscriptionController = async (
  req: Request,
  res: Response
) => {
  const user = requireUser(req, res);

  if (!user) return;

  const endpoint = req.body?.endpoint;

  if (!endpoint) {
    return res.status(400).json({
      success: false,
      message: "Push endpoint is required",
    });
  }

  try {
    await unregisterPushSubscription(user._id, endpoint);

    return res.status(200).json({
      success: true,
      message: "Push subscription removed",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to remove push subscription",
    });
  }
};

export const getVapidPublicKeyController = (_req: Request, res: Response) => {
  const publicKey = getVapidPublicKey();

  return res.status(200).json({
    success: true,
    publicKey,
    configured: publicKey.length > 0,
  });
};

export const streamAdminNotificationsController = (
  _req: Request,
  res: Response
) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendNotification = (notification: NotificationPayload) => {
    if (notification.role !== "admin") return;

    res.write(`event: notification-created\n`);
    res.write(`data: ${JSON.stringify(notification)}\n\n`);
  };

  bookingNotificationEvents.on("notification-created", sendNotification);
  res.write(`event: connected\n`);
  res.write(`data: {"success":true}\n\n`);

  const heartbeat = setInterval(() => {
    res.write(`event: heartbeat\n`);
    res.write(`data: {}\n\n`);
  }, 30000);

  _req.on("close", () => {
    clearInterval(heartbeat);
    bookingNotificationEvents.off("notification-created", sendNotification);
    res.end();
  });
};
