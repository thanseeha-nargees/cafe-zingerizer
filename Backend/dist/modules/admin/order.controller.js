"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAdminOrderStatusController = exports.getAdminOrdersController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const orderReady_websocket_js_1 = require("../notifications/orderReady.websocket.js");
const table_model_js_1 = require("../table/table.model.js");
const order_model_js_1 = require("../orders/order.model.js");
const ORDER_STATUSES = [
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "READY",
    "COMPLETED",
    "CANCELLED",
];
const isValidObjectId = (id) => mongoose_1.default.Types.ObjectId.isValid(id);
const isOrderStatus = (status) => typeof status === "string" && ORDER_STATUSES.includes(status);
const getAdminOrdersController = async (req, res) => {
    try {
        const { status, search } = req.query;
        const filters = {};
        if (typeof status === "string" && status !== "all") {
            if (!isOrderStatus(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid order status",
                });
            }
            filters.orderStatus = status;
        }
        if (typeof search === "string" && search.trim()) {
            const term = search.trim();
            filters.$or = [
                { customerName: { $regex: term, $options: "i" } },
                { customerPhone: { $regex: term, $options: "i" } },
            ];
        }
        const orders = await order_model_js_1.Order.find(filters)
            .sort({ createdAt: -1 })
            .populate("items.menuItemId", "name category image price")
            .populate("tableId", "tableNumber isActive isOccupied")
            .populate("userId", "userName email")
            .lean();
        return res.status(200).json({
            success: true,
            orders,
            statuses: ORDER_STATUSES,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to load orders",
        });
    }
};
exports.getAdminOrdersController = getAdminOrdersController;
const updateAdminOrderStatusController = async (req, res) => {
    try {
        res.set("Cache-Control", "no-store");
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order id",
            });
        }
        const nextStatus = req.body.orderStatus ?? req.body.status;
        if (!isOrderStatus(nextStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order status",
            });
        }
        const existingOrder = await order_model_js_1.Order.findById(req.params.id).select("orderStatus");
        if (!existingOrder) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }
        const previousStatus = existingOrder.orderStatus;
        const order = await order_model_js_1.Order.findByIdAndUpdate(req.params.id, { $set: { orderStatus: nextStatus } }, { new: true, runValidators: true })
            .populate("items.menuItemId", "name category image price")
            .populate("tableId", "tableNumber isActive isOccupied")
            .populate("userId", "userName email");
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }
        if (["COMPLETED", "CANCELLED"].includes(nextStatus) &&
            order.tableId &&
            order.orderType === "Dining") {
            const tableId = typeof order.tableId === "object" && "_id" in order.tableId
                ? order.tableId._id
                : order.tableId;
            await table_model_js_1.Table.findByIdAndUpdate(tableId, { isOccupied: false });
            await order.populate("tableId", "tableNumber isActive isOccupied");
        }
        if (nextStatus === "READY" && previousStatus !== "READY") {
            (0, orderReady_websocket_js_1.notifyOrderReady)(order);
        }
        return res.status(200).json({
            success: true,
            order,
            message: "Order status updated",
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update order status",
        });
    }
};
exports.updateAdminOrderStatusController = updateAdminOrderStatusController;
//# sourceMappingURL=order.controller.js.map