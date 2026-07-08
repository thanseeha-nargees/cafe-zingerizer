import { Router } from "express";
import {
  getAdminNotificationsController,
  markNotificationReadController,
  streamAdminNotificationsController,
} from "./notification.controller.js";
import { authorize, protect } from "../../middleware/authMiddleware.js";

const router = Router();

router.get("/admin", protect, authorize("admin"), getAdminNotificationsController);
router.get(
  "/admin/stream",
  protect,
  authorize("admin"),
  streamAdminNotificationsController
);
router.patch(
  "/admin/:notificationId/read",
  protect,
  authorize("admin"),
  markNotificationReadController
);

export default router;
