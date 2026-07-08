"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const category_routes_1 = __importDefault(require("../modules/categories/category.routes"));
const menu_routes_1 = __importDefault(require("../modules/menu/menu.routes"));
const cart_routes_1 = __importDefault(require("../modules/cart/cart.routes"));
const table_routes_1 = __importDefault(require("../modules/table/table.routes"));
const order_routes_1 = __importDefault(require("../modules/orders/order.routes"));
const notification_routes_1 = __importDefault(require("../modules/notifications/notification.routes"));
const admin_routes_js_1 = __importDefault(require("../modules/admin/admin.routes.js"));
const router = (0, express_1.Router)();
router.use("/categories", category_routes_1.default);
router.use("/menu", menu_routes_1.default);
router.use("/cart", cart_routes_1.default);
router.use("/tables", table_routes_1.default);
router.use("/orders", order_routes_1.default);
router.use("/notifications", notification_routes_1.default);
router.use("/admin", admin_routes_js_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map