"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminAuth_js_1 = require("../../middleware/adminAuth.js");
const roleMiddleware_js_1 = require("../../middleware/roleMiddleware.js");
const staff_controller_js_1 = require("./staff.controller.js");
const router = (0, express_1.Router)();
router.use(adminAuth_js_1.adminAuth, (0, roleMiddleware_js_1.roleMiddleware)("admin"));
router.get("/", staff_controller_js_1.getAdminStaffController);
router.post("/", staff_controller_js_1.createAdminStaffController);
router.get("/table-assignments", staff_controller_js_1.getAdminTableAssignmentsController);
router.patch("/table-assignments/:tableId", staff_controller_js_1.assignTableToStaffController);
router.get("/:id", staff_controller_js_1.getAdminStaffDetailsController);
router.patch("/:id", staff_controller_js_1.updateAdminStaffController);
router.delete("/:id", staff_controller_js_1.deleteAdminStaffController);
exports.default = router;
//# sourceMappingURL=staff.routes.js.map