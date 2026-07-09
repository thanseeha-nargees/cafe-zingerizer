import { Router } from "express";
import { protect } from "../../middleware/authMiddleware.js";
import { roleMiddleware } from "../../middleware/roleMiddleware.js";
import {
  getStaffAssignedTablesController,
  getStaffDashboardController,
  getStaffOrdersController,
  staffLoginController,
  updateStaffOrderStatusController,
} from "./staff.controller.js";

const router = Router();

router.post("/login", staffLoginController);

router.use(protect, roleMiddleware("staff"));
router.get("/dashboard", getStaffDashboardController);
router.get("/tables", getStaffAssignedTablesController);
router.get("/orders", getStaffOrdersController);
router.patch("/orders/:id/status", updateStaffOrderStatusController);

export default router;
