"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markRazorpayPaymentFailedController = exports.verifyRazorpayPaymentController = exports.createRazorpayOrderController = void 0;
const user_schema_js_1 = require("../auth/user.schema.js");
const payment_service_js_1 = require("./payment.service.js");
const payment_validation_js_1 = require("./payment.validation.js");
const getErrorMessage = (error, fallback) => error instanceof Error ? error.message : fallback;
const ensureCustomer = (req, res) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: "Authentication required",
        });
        return false;
    }
    if (req.user.role !== "user") {
        res.status(403).json({
            success: false,
            message: "Only customers can make payments",
        });
        return false;
    }
    return true;
};
const createRazorpayOrderController = async (req, res) => {
    try {
        if (!ensureCustomer(req, res))
            return;
        const validation = payment_validation_js_1.createRazorpayOrderSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                error: validation.error.format(),
            });
        }
        const user = await user_schema_js_1.User.findById(req.user._id).select("email").lean();
        const result = await (0, payment_service_js_1.createRazorpayOrderService)(req.user._id, validation.data, user?.email || "");
        return res.status(201).json({
            success: true,
            payment: result.payment,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error, "Unable to create payment order"),
        });
    }
};
exports.createRazorpayOrderController = createRazorpayOrderController;
const verifyRazorpayPaymentController = async (req, res) => {
    try {
        if (!ensureCustomer(req, res))
            return;
        const validation = payment_validation_js_1.verifyRazorpayPaymentSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                error: validation.error.format(),
            });
        }
        const { order } = await (0, payment_service_js_1.verifyRazorpayPaymentService)(req.user._id, validation.data);
        return res.status(201).json({
            success: true,
            message: "Payment verified and order created",
            data: order,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: getErrorMessage(error, "Payment verification failed"),
        });
    }
};
exports.verifyRazorpayPaymentController = verifyRazorpayPaymentController;
const markRazorpayPaymentFailedController = async (req, res) => {
    try {
        if (!ensureCustomer(req, res))
            return;
        const validation = payment_validation_js_1.markRazorpayPaymentFailedSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                error: validation.error.format(),
            });
        }
        await (0, payment_service_js_1.markRazorpayPaymentFailedService)(req.user._id, validation.data.razorpayOrderId, validation.data.reason);
        return res.status(200).json({
            success: true,
            message: "Payment failure recorded",
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: getErrorMessage(error, "Unable to record payment failure"),
        });
    }
};
exports.markRazorpayPaymentFailedController = markRazorpayPaymentFailedController;
//# sourceMappingURL=payment.controller.js.map