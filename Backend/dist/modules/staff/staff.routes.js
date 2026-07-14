"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_js_1 = require("../../middleware/authMiddleware.js");
const roleMiddleware_js_1 = require("../../middleware/roleMiddleware.js");
const staff_controller_js_1 = require("./staff.controller.js");
const router = (0, express_1.Router)();
router.post("/login", staff_controller_js_1.staffLoginController);
router.use(authMiddleware_js_1.protect, (0, roleMiddleware_js_1.roleMiddleware)("staff"));
router.get("/dashboard", staff_controller_js_1.getStaffDashboardController);
router.get("/profile", staff_controller_js_1.getStaffProfileController);
router.get("/tables", staff_controller_js_1.getStaffAssignedTablesController);
router.get("/orders", staff_controller_js_1.getStaffOrdersController);
router.patch("/orders/:id/accept", staff_controller_js_1.acceptTakeawayOrderController);
router.patch("/orders/:id/status", staff_controller_js_1.updateStaffOrderStatusController);
exports.default = router;
//# sourceMappingURL=staff.routes.js.map