"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminAuth_js_1 = require("../../middleware/adminAuth.js");
const roleMiddleware_js_1 = require("../../middleware/roleMiddleware.js");
const staff_controller_js_1 = require("./staff.controller.js");
const router = (0, express_1.Router)();
router.get("/", adminAuth_js_1.adminAuth, (0, roleMiddleware_js_1.roleMiddleware)("admin"), staff_controller_js_1.getAdminStaffController);
exports.default = router;
//# sourceMappingURL=staff.routes.js.map