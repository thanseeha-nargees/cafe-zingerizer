"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderByIdService = exports.getMyOrdersService = exports.createOrderService = void 0;
const cart_schema_js_1 = require("../cart/cart.schema.js");
const table_model_js_1 = require("../table/table.model.js");
const order_model_js_1 = require("./order.model.js");
const notification_service_js_1 = require("../notifications/notification.service.js");
const orderReady_websocket_js_1 = require("../notifications/orderReady.websocket.js");
const createOrderService = async (userId, orderType, customerName, customerPhone, tableId, options = {}) => {
    let selectedTable = null;
    if (orderType === "Dining") {
        selectedTable = await table_model_js_1.Table.findOne({
            _id: tableId,
            isActive: true,
        });
        if (!selectedTable) {
            throw new Error("Selected table is not valid");
        }
    }
    const cart = options.items
        ? null
        : await cart_schema_js_1.Cart.findOne({ userId }).populate("items.menuItemId");
    if ((!cart || cart.items.length === 0) && !options.items?.length) {
        throw new Error("Cart is empty");
    }
    const orderItems = options.items?.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: item.price,
    })) ||
        cart.items.map((item) => {
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
    const isPaidOrder = options.payment?.paymentStatus === "PAID";
    const confirmedAt = isPaidOrder
        ? options.payment?.transactionDate || new Date()
        : null;
    const order = await order_model_js_1.Order.create({
        userId,
        items: orderItems,
        orderType,
        tableId: orderType === "Dining" ? tableId : null,
        tableNumber: selectedTable?.tableNumber ?? null,
        assignedStaff: selectedTable?.assignedStaff ?? null,
        customerName,
        customerPhone,
        totalAmount,
        orderStatus: isPaidOrder ? "CONFIRMED" : "PENDING",
        paymentMethod: options.payment?.paymentMethod || "Online",
        paymentStatus: options.payment?.paymentStatus || "PENDING",
        paymentId: options.payment?.paymentId || "",
        razorpayOrderId: options.payment?.razorpayOrderId || "",
        transactionDate: options.payment?.transactionDate || null,
        confirmedAt,
    });
    if (selectedTable) {
        selectedTable.isOccupied = true;
        await selectedTable.save();
    }
    if (cart) {
        cart.set("items", []);
        await cart.save();
    }
    else {
        await cart_schema_js_1.Cart.updateOne({ userId }, { $set: { items: [] } });
    }
    await order.populate("items.menuItemId", "name category image price");
    await order.populate({
        path: "tableId",
        select: "tableNumber isActive isOccupied assignedStaff",
        populate: {
            path: "assignedStaff",
            select: "userName email role isActive",
        },
    });
    await order.populate("assignedStaff", "userName email role isActive");
    await order.populate("userId", "userName email");
    await (0, notification_service_js_1.createOrderLifecycleNotifications)(order);
    (0, orderReady_websocket_js_1.notifyOrderCreated)(order);
    return order;
};
exports.createOrderService = createOrderService;
const getMyOrdersService = async (userId) => {
    return await order_model_js_1.Order.find({ userId }).sort({
        createdAt: -1,
    });
};
exports.getMyOrdersService = getMyOrdersService;
const getOrderByIdService = async (orderId) => {
    const order = await order_model_js_1.Order.findById(orderId)
        .populate("items.menuItemId")
        .populate("tableId")
        .populate("userId", "userName email");
    if (!order) {
        throw new Error("Order not found");
    }
    return order;
};
exports.getOrderByIdService = getOrderByIdService;
//# sourceMappingURL=order.service.js.map