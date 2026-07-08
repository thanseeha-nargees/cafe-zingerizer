import { Router } from "express";
import {
  createOrderController,
  getOrderByIdController,
  getMyOrdersController,
} from "./order.controller.js";

import { authorize, protect } from "../../middleware/authMiddleware.js";

const router = Router();

router.post("/", protect, createOrderController);

router.get(
  "/my-orders",
  protect,
  getMyOrdersController
);

router.get(
  "/:orderId",
  protect,
  authorize("admin"),
  getOrderByIdController
);

export default router;
