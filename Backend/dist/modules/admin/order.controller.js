"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAdminOrderStatusController = exports.getAdminOrdersController = void 0;
const order_status_service_js_1 = require("../orders/order-status.service.js");
const order_model_js_1 = require("../orders/order.model.js");
const getAdminOrdersController = async (req, res) => {
    try {
        const { status, search } = req.query;
        const filters = {};
        if (typeof status === "string" && status !== "all") {
            if (!(0, order_status_service_js_1.isOrderStatus)(status)) {
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
            statuses: order_status_service_js_1.ORDER_STATUSES,
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
        if (!(0, order_status_service_js_1.isValidObjectId)(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order id",
            });
        }
        const nextStatus = req.body.orderStatus ?? req.body.status;
        if (!(0, order_status_service_js_1.isOrderStatus)(nextStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order status",
            });
        }
        const { order, foodReadySms } = await (0, order_status_service_js_1.updateOrderStatusWithSideEffects)(req.params.id, nextStatus);
        return res.status(200).json({
            success: true,
            order,
            foodReadySms,
            message: foodReadySms?.status === "failed"
                ? "Order status updated, but food ready SMS failed"
                : "Order status updated",
        });
    }
    catch (error) {
        if (error instanceof order_status_service_js_1.OrderStatusUpdateError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update order status",
        });
    }
};
exports.updateAdminOrderStatusController = updateAdminOrderStatusController;
//# sourceMappingURL=order.controller.js.map