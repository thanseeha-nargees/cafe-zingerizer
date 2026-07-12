import { Router } from "express";
import { protect } from "../../middleware/authMiddleware.js";
import {
  createRazorpayOrderController,
  markRazorpayPaymentFailedController,
  verifyRazorpayPaymentController,
} from "./payment.controller.js";

const router = Router();

router.post("/razorpay/order", protect, createRazorpayOrderController);
router.post("/razorpay/verify", protect, verifyRazorpayPaymentController);
router.post("/razorpay/failure", protect, markRazorpayPaymentFailedController);

export default router;
