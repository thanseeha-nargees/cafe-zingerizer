import { Router } from "express";
import { adminAuth } from "../../middleware/adminAuth.js";
import { roleMiddleware } from "../../middleware/roleMiddleware.js";
import { getAdminStaffController } from "./staff.controller.js";

const router = Router();

router.get("/", adminAuth, roleMiddleware("admin"), getAdminStaffController);

export default router;
