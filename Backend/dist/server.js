"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const database_js_1 = __importDefault(require("./config/database.js"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const auth_routes_js_1 = __importDefault(require("./modules/auth/auth.routes.js"));
const admin_routes_js_1 = __importDefault(require("./modules/admin/admin.routes.js"));
const category_routes_js_1 = __importDefault(require("./modules/categories/category.routes.js"));
const menu_routes_js_1 = __importDefault(require("./modules/menu/menu.routes.js"));
const order_routes_js_1 = __importDefault(require("./modules/orders/order.routes.js"));
const order_scheduler_js_1 = require("./modules/orders/order.scheduler.js");
const admin_seed_js_1 = require("./modules/auth/admin.seed.js");
const table_routes_js_1 = __importDefault(require("./modules/table/table.routes.js"));
const cart_routes_js_1 = __importDefault(require("./modules/cart/cart.routes.js"));
const notification_routes_js_1 = __importDefault(require("./modules/notifications/notification.routes.js"));
const orderReady_websocket_js_1 = require("./modules/notifications/orderReady.websocket.js");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
}));
app.use('/api/auth', auth_routes_js_1.default);
app.use("/api/admin", admin_routes_js_1.default);
app.use("/api/categories", category_routes_js_1.default);
app.use("/api/menu", menu_routes_js_1.default);
app.use("/api/orders", order_routes_js_1.default);
app.use("/api/tables", table_routes_js_1.default);
app.use("/api/cart", cart_routes_js_1.default);
app.use("/api/notifications", notification_routes_js_1.default);
(0, orderReady_websocket_js_1.initializeOrderReadyWebSocket)(server);
const PORT = process.env.PORT || 5000;
const startServer = async () => {
    await (0, database_js_1.default)();
    await (0, admin_seed_js_1.ensureDefaultSuperAdmin)();
    (0, order_scheduler_js_1.startFoodReadyNotificationWorker)().catch((error) => {
        console.log("food ready notification worker failed", error instanceof Error ? error.message : error);
    });
    server.listen(PORT, () => {
        console.log(`server running on the port number ${PORT}`);
    });
};
startServer().catch((error) => {
    console.log("server startup failed", error instanceof Error ? error.message : error);
});
//# sourceMappingURL=server.js.map