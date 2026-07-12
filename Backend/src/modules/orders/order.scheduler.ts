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

export const scheduleFoodReadyNotification = async (
  orderId: string,
  readyAt: Date
) => {
  await redisClient.zAdd(FOOD_READY_QUEUE_KEY, {
    score: readyAt.getTime(),
    value: orderId,
  });
};

export const clearScheduledFoodReadyNotification = async (orderId: string) => {
  await redisClient.zRem(FOOD_READY_QUEUE_KEY, orderId);
};

const processFoodReadyJob = async (orderId: string) => {
  const order = await Order.findById(orderId);

  if (!order || order.foodReadySmsSentAt) {
    await redisClient.zRem(FOOD_READY_QUEUE_KEY, orderId);
    return;
  }

  if (
    order.orderStatus !== "PREPARING" ||
    ["COMPLETED", "CANCELLED"].includes(order.orderStatus)
  ) {
    await redisClient.zRem(FOOD_READY_QUEUE_KEY, orderId);
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

  await redisClient.zRem(FOOD_READY_QUEUE_KEY, orderId);
};

const processDueFoodReadyJobs = async () => {
  const dueOrderIds = await redisClient.zRangeByScore(
    FOOD_READY_QUEUE_KEY,
    0,
    Date.now()
  );

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
};

export const getEstimatedReadyAt = (from = new Date()) =>
  new Date(from.getTime() + PREPARATION_TIME_MS);

export const getFoodReadyAt = () => getEstimatedReadyAt();
