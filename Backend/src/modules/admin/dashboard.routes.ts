import { Router } from "express";
import { adminAuth } from "../../middleware/adminAuth.js";
import { roleMiddleware } from "../../middleware/roleMiddleware.js";
import { getAdminDashboardController } from "./dashboard.controller.js";

const router = Router();

router.get("/", adminAuth, roleMiddleware("admin"), getAdminDashboardController);

export default router;
