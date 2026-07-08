"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFoodReadyAt = exports.startFoodReadyNotificationWorker = exports.scheduleFoodReadyNotification = void 0;
const redis_js_1 = __importDefault(require("../../config/redis.js"));
const orderReady_websocket_js_1 = require("../notifications/orderReady.websocket.js");
const order_model_js_1 = require("./order.model.js");
const order_sms_js_1 = require("./order.sms.js");
const FOOD_READY_QUEUE_KEY = "orders:food-ready:queue";
const FOOD_READY_DELAY_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 1000;
const scheduleFoodReadyNotification = async (orderId, readyAt) => {
    await redis_js_1.default.zAdd(FOOD_READY_QUEUE_KEY, {
        score: readyAt.getTime(),
        value: orderId,
    });
};
exports.scheduleFoodReadyNotification = scheduleFoodReadyNotification;
const processFoodReadyJob = async (orderId) => {
    const order = await order_model_js_1.Order.findById(orderId);
    if (!order || order.foodReadySmsSentAt) {
        await redis_js_1.default.zRem(FOOD_READY_QUEUE_KEY, orderId);
        return;
    }
    if (["COMPLETED", "CANCELLED"].includes(order.orderStatus)) {
        await redis_js_1.default.zRem(FOOD_READY_QUEUE_KEY, orderId);
        return;
    }
    const previousStatus = order.orderStatus;
    if (previousStatus !== "READY") {
        order.orderStatus = "READY";
        await order.save();
        (0, orderReady_websocket_js_1.notifyOrderReady)(order);
    }
    await (0, order_sms_js_1.sendFoodReadySms)(order.customerPhone, order.customerName);
    order.foodReadySmsSentAt = new Date();
    await order.save();
    await redis_js_1.default.zRem(FOOD_READY_QUEUE_KEY, orderId);
};
const processDueFoodReadyJobs = async () => {
    const dueOrderIds = await redis_js_1.default.zRangeByScore(FOOD_READY_QUEUE_KEY, 0, Date.now());
    for (const orderId of dueOrderIds) {
        try {
            await processFoodReadyJob(orderId);
        }
        catch (error) {
            console.log("food ready notification failed", error instanceof Error ? error.message : error);
        }
    }
};
const restorePendingFoodReadyJobs = async () => {
    const orders = await order_model_js_1.Order.find({
        foodReadyAt: { $ne: null },
        foodReadySmsSentAt: null,
        orderStatus: { $nin: ["COMPLETED", "CANCELLED"] },
    }).select("_id foodReadyAt");
    for (const order of orders) {
        if (order.foodReadyAt) {
            await (0, exports.scheduleFoodReadyNotification)(order._id.toString(), order.foodReadyAt);
        }
    }
};
const startFoodReadyNotificationWorker = async () => {
    await restorePendingFoodReadyJobs();
    setInterval(processDueFoodReadyJobs, POLL_INTERVAL_MS);
};
exports.startFoodReadyNotificationWorker = startFoodReadyNotificationWorker;
const getFoodReadyAt = () => new Date(Date.now() + FOOD_READY_DELAY_MS);
exports.getFoodReadyAt = getFoodReadyAt;
//# sourceMappingURL=order.scheduler.js.map