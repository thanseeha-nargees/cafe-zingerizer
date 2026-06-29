import { Router } from "express";
import {
  createOrderController,
  getMyOrdersController,
} from "./order.controller.js";

import { protect } from "../../middleware/authMiddleware.js";

const router = Router();

router.post("/", protect, createOrderController);

router.get(
  "/my-orders",
  protect,
  getMyOrdersController
);

export default router;
