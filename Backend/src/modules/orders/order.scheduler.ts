import redisClient from "../../config/redis.js";
import { Order } from "./order.model.js";
import { sendFoodReadySms } from "./order.sms.js";

const FOOD_READY_QUEUE_KEY = "orders:food-ready:queue";
const FOOD_READY_DELAY_MS = 10 * 60 * 1000;
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

const processFoodReadyJob = async (orderId: string) => {
  const order = await Order.findById(orderId);

  if (!order || order.foodReadySmsSentAt) {
    await redisClient.zRem(FOOD_READY_QUEUE_KEY, orderId);
    return;
  }

  if (["COMPLETED", "CANCELLED"].includes(order.orderStatus)) {
    await redisClient.zRem(FOOD_READY_QUEUE_KEY, orderId);
    return;
  }

  order.orderStatus = "READY";
  await order.save();

  await sendFoodReadySms(order.customerPhone, order.customerName);

  order.foodReadySmsSentAt = new Date();
  await order.save();

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
    orderStatus: { $nin: ["COMPLETED", "CANCELLED"] },
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

export const getFoodReadyAt = () => new Date(Date.now() + FOOD_READY_DELAY_MS);
