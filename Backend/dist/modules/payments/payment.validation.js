"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markRazorpayPaymentFailedSchema = exports.verifyRazorpayPaymentSchema = exports.createRazorpayOrderSchema = void 0;
const zod_1 = require("zod");
const order_validation_js_1 = require("../orders/order.validation.js");
exports.createRazorpayOrderSchema = order_validation_js_1.createOrderSchema;
exports.verifyRazorpayPaymentSchema = zod_1.z.object({
    razorpayOrderId: zod_1.z.string().trim().min(1, "Razorpay order id is required"),
    razorpayPaymentId: zod_1.z.string().trim().min(1, "Razorpay payment id is required"),
    razorpaySignature: zod_1.z.string().trim().min(1, "Payment signature is required"),
});
exports.markRazorpayPaymentFailedSchema = zod_1.z.object({
    razorpayOrderId: zod_1.z.string().trim().min(1, "Razorpay order id is required"),
    reason: zod_1.z.string().trim().max(500).optional(),
});
//# sourceMappingURL=payment.validation.js.map