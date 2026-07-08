"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminAuth_js_1 = require("../../middleware/adminAuth.js");
const roleMiddleware_js_1 = require("../../middleware/roleMiddleware.js");
const dashboard_controller_js_1 = require("./dashboard.controller.js");
const router = (0, express_1.Router)();
router.get("/", adminAuth_js_1.adminAuth, (0, roleMiddleware_js_1.roleMiddleware)("admin"), dashboard_controller_js_1.getAdminDashboardController);
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map