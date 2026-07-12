"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markRazorpayPaymentFailedService = exports.verifyRazorpayPaymentService = exports.createRazorpayOrderService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const cart_schema_js_1 = require("../cart/cart.schema.js");
const order_model_js_1 = require("../orders/order.model.js");
const order_service_js_1 = require("../orders/order.service.js");
const table_model_js_1 = require("../table/table.model.js");
const payment_model_js_1 = require("./payment.model.js");
const getRazorpayCredentials = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
        throw new Error("Razorpay credentials are not configured");
    }
    return { keyId, keySecret };
};
const getRazorpayAuthHeader = (keyId, keySecret) => `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
const buildCartSnapshot = async (userId) => {
    const cart = await cart_schema_js_1.Cart.findOne({ userId }).populate("items.menuItemId");
    if (!cart || cart.items.length === 0) {
        throw new Error("Cart is empty");
    }
    const items = cart.items.map((item) => {
        const menuItem = item.menuItemId;
        const quantity = Number(item.quantity || 0);
        const price = Number(menuItem?.price || 0);
        if (!menuItem?._id || quantity <= 0 || price <= 0) {
            throw new Error("Menu item not found");
        }
        return {
            menuItemId: String(menuItem._id),
            quantity,
            price,
        };
    });
    const totalAmount = items.reduce((total, item) => total + item.price * item.quantity, 0);
    if (totalAmount <= 0) {
        throw new Error("Cart total must be greater than zero");
    }
    return { items, totalAmount };
};
const validateDiningTable = async (orderType, tableId) => {
    if (orderType !== "Dining")
        return null;
    const table = await table_model_js_1.Table.findOne({
        _id: tableId,
        isActive: true,
    });
    if (!table) {
        throw new Error("Selected table is not valid");
    }
    return table;
};
const createRazorpayOrder = async (amount, currency, receipt, notes) => {
    const { keyId, keySecret } = getRazorpayCredentials();
    const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
            Authorization: getRazorpayAuthHeader(keyId, keySecret),
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            amount,
            currency,
            receipt,
            notes,
        }),
    });
    const payload = (await response.json().catch(() => ({})));
    if (!response.ok) {
        throw new Error(payload?.error?.description ||
            payload?.message ||
            "Unable to create Razorpay order");
    }
    return payload;
};
const verifySignature = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
    const { keySecret } = getRazorpayCredentials();
    const expectedSignature = crypto_1.default
        .createHmac("sha256", keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");
    const expectedBuffer = Buffer.from(expectedSignature);
    const receivedBuffer = Buffer.from(razorpaySignature);
    return (expectedBuffer.length === receivedBuffer.length &&
        crypto_1.default.timingSafeEqual(expectedBuffer, receivedBuffer));
};
const getPopulatedOrder = (orderId) => order_model_js_1.Order.findById(orderId)
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
const createRazorpayOrderService = async (userId, input, userEmail) => {
    const { keyId } = getRazorpayCredentials();
    await validateDiningTable(input.orderType, input.tableId);
    const { items, totalAmount } = await buildCartSnapshot(userId);
    const amount = Math.round(totalAmount * 100);
    const currency = "INR";
    const receipt = `rcpt_${Date.now().toString(36)}_${userId.slice(-8)}`;
    const razorpayOrder = await createRazorpayOrder(amount, currency, receipt, {
        userId,
        orderType: input.orderType,
    });
    const paymentSession = await payment_model_js_1.PaymentSession.create({
        userId,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount || amount,
        amountInRupees: totalAmount,
        currency: razorpayOrder.currency || currency,
        orderType: input.orderType,
        tableId: input.orderType === "Dining" ? input.tableId : null,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        items,
    });
    return {
        session: paymentSession,
        payment: {
            keyId,
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount || amount,
            currency: razorpayOrder.currency || currency,
            name: process.env.RAZORPAY_CHECKOUT_NAME || "Cafe Management System",
            description: "Prepaid cafe order",
            prefill: {
                name: input.customerName,
                email: userEmail || "",
                contact: input.customerPhone,
            },
        },
    };
};
exports.createRazorpayOrderService = createRazorpayOrderService;
const verifyRazorpayPaymentService = async (userId, input) => {
    const session = await payment_model_js_1.PaymentSession.findOne({
        userId,
        razorpayOrderId: input.razorpayOrderId,
    });
    if (!session) {
        throw new Error("Payment session not found");
    }
    if (session.status === "PAID" && session.orderId) {
        const existingOrder = await getPopulatedOrder(String(session.orderId));
        if (existingOrder) {
            return { order: existingOrder, session };
        }
    }
    if (!verifySignature(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature)) {
        session.status = "FAILED";
        session.failureReason = "Invalid Razorpay payment signature";
        await session.save();
        throw new Error("Payment verification failed");
    }
    const transactionDate = new Date();
    const orderItems = session.items.map((item) => ({
        menuItemId: String(item.menuItemId),
        quantity: Number(item.quantity),
        price: Number(item.price),
    }));
    const order = await (0, order_service_js_1.createOrderService)(userId, session.orderType, session.customerName, session.customerPhone, session.tableId ? String(session.tableId) : undefined, {
        items: orderItems,
        payment: {
            paymentMethod: "Online",
            paymentStatus: "PAID",
            paymentId: input.razorpayPaymentId,
            razorpayOrderId: input.razorpayOrderId,
            transactionDate,
        },
    });
    session.status = "PAID";
    session.orderId = order._id;
    session.razorpayPaymentId = input.razorpayPaymentId;
    session.razorpaySignature = input.razorpaySignature;
    session.transactionDate = transactionDate;
    session.failureReason = "";
    await session.save();
    return { order, session };
};
exports.verifyRazorpayPaymentService = verifyRazorpayPaymentService;
const markRazorpayPaymentFailedService = async (userId, razorpayOrderId, reason = "Payment failed or was cancelled") => {
    const session = await payment_model_js_1.PaymentSession.findOne({
        userId,
        razorpayOrderId,
        status: "CREATED",
    });
    if (!session)
        return null;
    session.status = "FAILED";
    session.failureReason = reason;
    await session.save();
    return session;
};
exports.markRazorpayPaymentFailedService = markRazorpayPaymentFailedService;
//# sourceMappingURL=payment.service.js.map