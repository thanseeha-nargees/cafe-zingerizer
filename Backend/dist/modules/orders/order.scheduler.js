"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFoodReadyAt = exports.getEstimatedReadyAt = exports.startFoodReadyNotificationWorker = exports.clearScheduledFoodReadyNotification = exports.scheduleFoodReadyNotification = exports.PREPARATION_TIME_MS = void 0;
const redis_js_1 = __importDefault(require("../../config/redis.js"));
const orderReady_websocket_js_1 = require("../notifications/orderReady.websocket.js");
const notification_service_js_1 = require("../notifications/notification.service.js");
const order_model_js_1 = require("./order.model.js");
const order_sms_js_1 = require("./order.sms.js");
const FOOD_READY_QUEUE_KEY = "orders:food-ready:queue";
exports.PREPARATION_TIME_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 1000;
const scheduleFoodReadyNotification = async (orderId, readyAt) => {
    await redis_js_1.default.zAdd(FOOD_READY_QUEUE_KEY, {
        score: readyAt.getTime(),
        value: orderId,
    });
};
exports.scheduleFoodReadyNotification = scheduleFoodReadyNotification;
const clearScheduledFoodReadyNotification = async (orderId) => {
    await redis_js_1.default.zRem(FOOD_READY_QUEUE_KEY, orderId);
};
exports.clearScheduledFoodReadyNotification = clearScheduledFoodReadyNotification;
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
        await order.populate("userId", "userName email");
        await order.populate("assignedStaff", "userName email role isActive");
        await order.populate("tableId", "tableNumber isActive isOccupied assignedStaff");
        await (0, notification_service_js_1.createOrderStatusNotifications)(order, "READY", previousStatus);
        (0, orderReady_websocket_js_1.notifyOrderReady)(order);
        (0, orderReady_websocket_js_1.notifyOrderStatusUpdated)(order);
    }
    await (0, order_sms_js_1.sendFoodReadySmsOnce)(order);
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
const getEstimatedReadyAt = (from = new Date()) => new Date(from.getTime() + exports.PREPARATION_TIME_MS);
exports.getEstimatedReadyAt = getEstimatedReadyAt;
const getFoodReadyAt = () => (0, exports.getEstimatedReadyAt)();
exports.getFoodReadyAt = getFoodReadyAt;
//# sourceMappingURL=order.scheduler.js.map