"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const order_controller_js_1 = require("./order.controller.js");
const authMiddleware_js_1 = require("../../middleware/authMiddleware.js");
const router = (0, express_1.Router)();
router.post("/", authMiddleware_js_1.protect, order_controller_js_1.createOrderController);
router.get("/my-orders", authMiddleware_js_1.protect, order_controller_js_1.getMyOrdersController);
exports.default = router;
//# sourceMappingURL=order.routes.js.map