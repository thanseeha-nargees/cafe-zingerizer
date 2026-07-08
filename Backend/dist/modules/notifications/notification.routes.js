"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_js_1 = require("./notification.controller.js");
const authMiddleware_js_1 = require("../../middleware/authMiddleware.js");
const router = (0, express_1.Router)();
router.get("/admin", authMiddleware_js_1.protect, (0, authMiddleware_js_1.authorize)("admin"), notification_controller_js_1.getAdminNotificationsController);
router.get("/admin/stream", authMiddleware_js_1.protect, (0, authMiddleware_js_1.authorize)("admin"), notification_controller_js_1.streamAdminNotificationsController);
router.patch("/admin/:notificationId/read", authMiddleware_js_1.protect, (0, authMiddleware_js_1.authorize)("admin"), notification_controller_js_1.markNotificationReadController);
exports.default = router;
//# sourceMappingURL=notification.routes.js.map