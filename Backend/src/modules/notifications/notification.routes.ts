import { Router } from "express";
import {
  getAdminNotificationsController,
  getNotificationsController,
  getUnreadNotificationCountController,
  getVapidPublicKeyController,
  markAllNotificationsReadController,
  markNotificationReadController,
  registerPushSubscriptionController,
  streamAdminNotificationsController,
  unregisterPushSubscriptionController,
} from "./notification.controller.js";
import { authorize, protect } from "../../middleware/authMiddleware.js";

const router = Router();

router.get("/push-public-key", getVapidPublicKeyController);
router.use(protect);

router.get("/", getNotificationsController);
router.get("/unread-count", getUnreadNotificationCountController);
router.patch("/read-all", markAllNotificationsReadController);
router.post("/push-subscriptions", registerPushSubscriptionController);
router.delete("/push-subscriptions", unregisterPushSubscriptionController);
router.patch("/:notificationId/read", markNotificationReadController);

router.get("/admin", authorize("admin"), getAdminNotificationsController);
router.get(
  "/admin/stream",
  authorize("admin"),
  streamAdminNotificationsController
);

export default router;
