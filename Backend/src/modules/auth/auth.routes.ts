import express from "express";
import rateLimit from "express-rate-limit";
import {
  logoutController,
  meController,
  refreshTokenController,
  sendOtpController,
  verifyOtpController,
} from "./auth.controller.js";
import { protect } from "../../middleware/authMiddleware.js";

const router = express.Router();

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP requests. Please try again later.",
  },
});


router.post("/send-otp", otpLimiter, sendOtpController);
router.post("/verify-otp", verifyOtpController);
router.post("/otp-verify", verifyOtpController);
router.post("/refresh", refreshTokenController);
router.get("/me", protect, meController);
router.post("/logout", logoutController);

export default router;
