import { Router } from "express";
import { adminAuth } from "../../middleware/adminAuth.js";
import { roleMiddleware } from "../../middleware/roleMiddleware.js";
import {
  assignTableToStaffController,
  createAdminStaffController,
  deleteAdminStaffController,
  getAdminTableAssignmentsController,
  getAdminStaffController,
  getAdminStaffDetailsController,
  updateAdminStaffController,
} from "./staff.controller.js";

const router = Router();

router.use(adminAuth, roleMiddleware("admin"));

router.get("/", getAdminStaffController);
router.post("/", createAdminStaffController);
router.get("/table-assignments", getAdminTableAssignmentsController);
router.patch("/table-assignments/:tableId", assignTableToStaffController);
router.get("/:id", getAdminStaffDetailsController);
router.patch("/:id", updateAdminStaffController);
router.delete("/:id", deleteAdminStaffController);

export default router;
