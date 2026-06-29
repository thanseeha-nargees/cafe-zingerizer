"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyOrdersController = exports.createOrderController = void 0;
const order_service_js_1 = require("./order.service.js");
const order_validation_js_1 = require("./order.validation.js");
const createOrderController = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }
        const validation = order_validation_js_1.createOrderSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: validation.error.format(),
            });
        }
        const userId = req.user._id;
        const { orderType, tableId, customerName, customerPhone } = validation.data;
        const order = await (0, order_service_js_1.createOrderService)(userId, orderType, customerName, customerPhone, tableId);
        res.status(201).json({
            success: true,
            data: order,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Something went wrong",
        });
    }
};
exports.createOrderController = createOrderController;
const getMyOrdersController = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }
        const userId = req.user._id;
        const orders = await (0, order_service_js_1.getMyOrdersService)(userId);
        res.status(200).json({
            success: true,
            data: orders,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};
exports.getMyOrdersController = getMyOrdersController;
//# sourceMappingURL=order.controller.js.map