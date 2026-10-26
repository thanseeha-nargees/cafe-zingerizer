import redisClient from "../../config/redis.js";
import {
  notifyOrderReady,
  notifyOrderStatusUpdated,
} from "../notifications/orderReady.websocket.js";
import { createOrderStatusNotifications } from "../notifications/notification.service.js";
import { Order } from "./order.model.js";
import { sendFoodReadySmsOnce } from "./order.sms.js";

const FOOD_READY_QUEUE_KEY = "orders:food-ready:queue";
export const PREPARATION_TIME_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 1000;

const inMemoryQueue = new Map<string, number>();

export const scheduleFoodReadyNotification = async (
  orderId: string,
  readyAt: Date
) => {
  if (redisClient) {
    await redisClient.zAdd(FOOD_READY_QUEUE_KEY, {
      score: readyAt.getTime(),
      value: orderId,
    });
  } else {
    inMemoryQueue.set(orderId, readyAt.getTime());
  }
};

export const clearScheduledFoodReadyNotification = async (orderId: string) => {
  if (redisClient) {
    await redisClient.zRem(FOOD_READY_QUEUE_KEY, orderId);
  } else {
    inMemoryQueue.delete(orderId);
  }
};

const processFoodReadyJob = async (orderId: string) => {
  await clearScheduledFoodReadyNotification(orderId);

  const order = await Order.findById(orderId);

  if (!order || order.foodReadySmsSentAt) {
    return;
  }

  if (
    order.orderStatus !== "PREPARING" ||
    ["COMPLETED", "CANCELLED"].includes(order.orderStatus)
  ) {
    return;
  }

  const previousStatus = order.orderStatus;

  order.orderStatus = "READY";
  await order.save();
  await order.populate("userId", "userName email");
  await order.populate("assignedStaff", "userName email role isActive");
  await order.populate("tableId", "tableNumber isActive isOccupied assignedStaff");
  await createOrderStatusNotifications(order, "READY", previousStatus);
  notifyOrderReady(order);
  notifyOrderStatusUpdated(order);

  await sendFoodReadySmsOnce(order);
};

const processDueFoodReadyJobs = async () => {
  const now = Date.now();
  const dueOrderIds: string[] = [];

  if (redisClient) {
    const redisDue = await redisClient.zRangeByScore(
      FOOD_READY_QUEUE_KEY,
      0,
      now
    );
    dueOrderIds.push(...redisDue);
  } else {
    for (const [orderId, readyTime] of inMemoryQueue.entries()) {
      if (readyTime <= now) {
        dueOrderIds.push(orderId);
      }
    }
  }

  for (const orderId of dueOrderIds) {
    try {
      await processFoodReadyJob(orderId);
    } catch (error) {
      console.log(
        "food ready notification failed",
        error instanceof Error ? error.message : error
      );
    }
  }
};

const restorePendingFoodReadyJobs = async () => {
  const orders = await Order.find({
    foodReadyAt: { $ne: null },
    foodReadySmsSentAt: null,
    orderStatus: "PREPARING",
  }).select("_id foodReadyAt");

  for (const order of orders) {
    if (order.foodReadyAt) {
      await scheduleFoodReadyNotification(
        order._id.toString(),
        order.foodReadyAt
      );
    }
  }
};

export const startFoodReadyNotificationWorker = async () => {
  await restorePendingFoodReadyJobs();
  setInterval(processDueFoodReadyJobs, POLL_INTERVAL_MS);
  if (redisClient) {
    console.log("[Worker] Food-ready notification worker started (Redis queue)");
  } else {
    console.log("[Worker] Food-ready notification worker started (in-memory queue fallback)");
  }
};

export const getEstimatedReadyAt = (from = new Date()) =>
  new Date(from.getTime() + PREPARATION_TIME_MS);

export const getFoodReadyAt = () => getEstimatedReadyAt();
