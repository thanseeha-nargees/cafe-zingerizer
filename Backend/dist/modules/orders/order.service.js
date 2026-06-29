"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyOrdersService = exports.createOrderService = void 0;
const cart_schema_js_1 = require("../cart/cart.schema.js");
const table_model_js_1 = require("../table/table.model.js");
const order_model_js_1 = require("./order.model.js");
const order_scheduler_js_1 = require("./order.scheduler.js");
const createOrderService = async (userId, orderType, customerName, customerPhone, tableId) => {
    let selectedTable = null;
    if (orderType === "Dining") {
        selectedTable = await table_model_js_1.Table.findOne({
            _id: tableId,
            isActive: true,
            isOccupied: false,
        });
        if (!selectedTable) {
            throw new Error("Selected table is not available");
        }
    }
    const cart = await cart_schema_js_1.Cart.findOne({ userId }).populate("items.menuItemId");
    if (!cart || cart.items.length === 0) {
        throw new Error("Cart is empty");
    }
    const orderItems = cart.items.map((item) => {
        const menuItem = item.menuItemId;
        if (!menuItem?.price) {
            throw new Error("Menu item not found");
        }
        return {
            menuItemId: menuItem._id,
            quantity: item.quantity,
            price: menuItem.price,
        };
    });
    const totalAmount = orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const foodReadyAt = (0, order_scheduler_js_1.getFoodReadyAt)();
    const order = await order_model_js_1.Order.create({
        userId,
        items: orderItems,
        orderType,
        tableId: orderType === "Dining" ? tableId : null,
        customerName,
        customerPhone,
        totalAmount,
        foodReadyAt,
    });
    await (0, order_scheduler_js_1.scheduleFoodReadyNotification)(order._id.toString(), foodReadyAt);
    if (selectedTable) {
        selectedTable.isOccupied = true;
        await selectedTable.save();
    }
    cart.set("items", []);
    await cart.save();
    return order;
};
exports.createOrderService = createOrderService;
const getMyOrdersService = async (userId) => {
    return await order_model_js_1.Order.find({ userId }).sort({
        createdAt: -1,
    });
};
exports.getMyOrdersService = getMyOrdersService;
//# sourceMappingURL=order.service.js.map