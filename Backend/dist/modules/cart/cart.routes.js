"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cart_controller_js_1 = require("./cart.controller.js");
const router = (0, express_1.Router)();
router.post("/", cart_controller_js_1.addToCart);
router.get("/:userId", cart_controller_js_1.getCart);
exports.default = router;
//# sourceMappingURL=cart.routes.js.map