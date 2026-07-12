"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderStatusWithSideEffects = exports.isOrderStatus = exports.isValidObjectId = exports.OrderStatusUpdateError = exports.ORDER_STATUSES = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const orderReady_websocket_js_1 = require("../notifications/orderReady.websocket.js");
const notification_service_js_1 = require("../notifications/notification.service.js");
const table_model_js_1 = require("../table/table.model.js");
const order_model_js_1 = require("./order.model.js");
const order_scheduler_js_1 = require("./order.scheduler.js");
const order_sms_js_1 = require("./order.sms.js");
exports.ORDER_STATUSES = [
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "READY",
    "COMPLETED",
    "CANCELLED",
];
class OrderStatusUpdateError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}
exports.OrderStatusUpdateError = OrderStatusUpdateError;
const isValidObjectId = (id) => mongoose_1.default.Types.ObjectId.isValid(id);
exports.isValidObjectId = isValidObjectId;
const isOrderStatus = (status) => typeof status === "string" && exports.ORDER_STATUSES.includes(status);
exports.isOrderStatus = isOrderStatus;
const getErrorMessage = (error) => error instanceof Error ? error.message : String(error);
const updateOrderStatusWithSideEffects = async (orderId, nextStatus) => {
    const existingOrder = await order_model_js_1.Order.findById(orderId).select("orderStatus");
    if (!existingOrder) {
        throw new OrderStatusUpdateError("Order not found", 404);
    }
    const previousStatus = existingOrder.orderStatus;
    const statusUpdate = { orderStatus: nextStatus };
    const shouldStartPreparationTimer = nextStatus === "PREPARING" && previousStatus !== "PREPARING";
    const shouldClearPreparationTimer = previousStatus === "PREPARING" && nextStatus !== "PREPARING";
    if (shouldStartPreparationTimer) {
        const preparingStartedAt = new Date();
        const estimatedReadyAt = (0, order_scheduler_js_1.getEstimatedReadyAt)(preparingStartedAt);
        statusUpdate.preparingStartedAt = preparingStartedAt;
        statusUpdate.estimatedReadyAt = estimatedReadyAt;
        statusUpdate.foodReadyAt = estimatedReadyAt;
        statusUpdate.foodReadySmsSentAt = null;
    }
    const order = await order_model_js_1.Order.findByIdAndUpdate(orderId, { $set: statusUpdate }, { returnDocument: "after", runValidators: true })
        .populate("items.menuItemId", "name category image price")
        .populate({
        path: "tableId",
        select: "tableNumber isActive isOccupied assignedStaff",
        populate: {
            path: "assignedStaff",
            select: "userName email role isActive",
        },
    })
        .populate("assignedStaff", "userName email role isActive")
        .populate("userId", "userName email");
    if (!order) {
        throw new OrderStatusUpdateError("Order not found", 404);
    }
    if (shouldStartPreparationTimer && order.estimatedReadyAt) {
        await (0, order_scheduler_js_1.scheduleFoodReadyNotification)(String(order._id), order.estimatedReadyAt).catch((error) => {
            console.log("food ready notification queue schedule failed", getErrorMessage(error));
        });
    }
    else if (shouldClearPreparationTimer) {
        await (0, order_scheduler_js_1.clearScheduledFoodReadyNotification)(String(order._id)).catch((error) => {
            console.log("food ready notification queue cleanup failed", getErrorMessage(error));
        });
    }
    if (["COMPLETED", "CANCELLED"].includes(nextStatus) &&
        order.tableId &&
        order.orderType === "Dining") {
        const tableId = typeof order.tableId === "object" && "_id" in order.tableId
            ? order.tableId._id
            : order.tableId;
        await table_model_js_1.Table.findByIdAndUpdate(tableId, { isOccupied: false });
        await order.populate({
            path: "tableId",
            select: "tableNumber isActive isOccupied assignedStaff",
            populate: {
                path: "assignedStaff",
                select: "userName email role isActive",
            },
        });
    }
    let foodReadySms = null;
    if (nextStatus === "READY" && previousStatus !== "READY") {
        (0, orderReady_websocket_js_1.notifyOrderReady)(order);
        try {
            foodReadySms = await (0, order_sms_js_1.sendFoodReadySmsOnce)(order);
            await (0, order_scheduler_js_1.clearScheduledFoodReadyNotification)(String(order._id)).catch((error) => {
                console.log("food ready notification queue cleanup failed", getErrorMessage(error));
            });
        }
        catch (error) {
            foodReadySms = {
                status: "failed",
                error: getErrorMessage(error),
            };
            console.log("food ready SMS failed", JSON.stringify({
                orderId: String(order._id),
                error: foodReadySms.error,
            }));
        }
    }
    await (0, notification_service_js_1.createOrderStatusNotifications)(order, nextStatus, previousStatus);
    (0, orderReady_websocket_js_1.notifyOrderStatusUpdated)(order);
    return { order, foodReadySms };
};
exports.updateOrderStatusWithSideEffects = updateOrderStatusWithSideEffects;
//# sourceMappingURL=order-status.service.js.map