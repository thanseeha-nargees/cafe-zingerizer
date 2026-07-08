import { Router } from "express";
import { adminAuth } from "../../middleware/adminAuth.js";
import { roleMiddleware } from "../../middleware/roleMiddleware.js";
import upload from "../../middleware/uploader.middleware.js";
import { adminLoginController } from "./admin.controller.js";
import dashboardRoutes from "./dashboard.routes.js";
import {
  getAdminOrdersController,
  updateAdminOrderStatusController,
} from "./order.controller.js";
import {
  createAdminProductController,
  deleteAdminProductController,
  getAdminProductController,
  getAdminProductsController,
  updateAdminProductController,
} from "./product.controller.js";
import staffRoutes from "./staff.routes.js";
import {
  getAdminUsersController,
  updateAdminUserController,
} from "./user.controller.js";

const router = Router();

router.post("/login", adminLoginController);
router.use("/dashboard", dashboardRoutes);
router.use("/staff", staffRoutes);
router.get(
  "/users",
  adminAuth,
  roleMiddleware("admin"),
  getAdminUsersController
);
router.patch(
  "/users/:id",
  adminAuth,
  roleMiddleware("admin"),
  updateAdminUserController
);
router.get(
  "/orders",
  adminAuth,
  roleMiddleware("admin"),
  getAdminOrdersController
);
router.patch(
  "/orders/:id/status",
  adminAuth,
  roleMiddleware("admin"),
  updateAdminOrderStatusController
);
router.get(
  "/products",
  adminAuth,
  roleMiddleware("admin"),
  getAdminProductsController
);
router.post(
  "/products",
  adminAuth,
  roleMiddleware("admin"),
  upload.single("image"),
  createAdminProductController
);
router.get(
  "/products/:id",
  adminAuth,
  roleMiddleware("admin"),
  getAdminProductController
);
router.put(
  "/products/:id",
  adminAuth,
  roleMiddleware("admin"),
  upload.single("image"),
  updateAdminProductController
);
router.delete(
  "/products/:id",
  adminAuth,
  roleMiddleware("admin"),
  deleteAdminProductController
);

export default router;
