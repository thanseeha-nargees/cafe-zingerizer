"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_js_1 = require("../../middleware/authMiddleware.js");
const payment_controller_js_1 = require("./payment.controller.js");
const router = (0, express_1.Router)();
router.post("/razorpay/order", authMiddleware_js_1.protect, payment_controller_js_1.createRazorpayOrderController);
router.post("/razorpay/verify", authMiddleware_js_1.protect, payment_controller_js_1.verifyRazorpayPaymentController);
router.post("/razorpay/failure", authMiddleware_js_1.protect, payment_controller_js_1.markRazorpayPaymentFailedController);
exports.default = router;
//# sourceMappingURL=payment.routes.js.map