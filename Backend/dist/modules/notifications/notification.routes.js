"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_js_1 = require("./notification.controller.js");
const authMiddleware_js_1 = require("../../middleware/authMiddleware.js");
const router = (0, express_1.Router)();
router.get("/push-public-key", notification_controller_js_1.getVapidPublicKeyController);
router.use(authMiddleware_js_1.protect);
router.get("/", notification_controller_js_1.getNotificationsController);
router.get("/unread-count", notification_controller_js_1.getUnreadNotificationCountController);
router.patch("/read-all", notification_controller_js_1.markAllNotificationsReadController);
router.post("/push-subscriptions", notification_controller_js_1.registerPushSubscriptionController);
router.delete("/push-subscriptions", notification_controller_js_1.unregisterPushSubscriptionController);
router.patch("/:notificationId/read", notification_controller_js_1.markNotificationReadController);
router.get("/admin", (0, authMiddleware_js_1.authorize)("admin"), notification_controller_js_1.getAdminNotificationsController);
router.get("/admin/stream", (0, authMiddleware_js_1.authorize)("admin"), notification_controller_js_1.streamAdminNotificationsController);
exports.default = router;
//# sourceMappingURL=notification.routes.js.map