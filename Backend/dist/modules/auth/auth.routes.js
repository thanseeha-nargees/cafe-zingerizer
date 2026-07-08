"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_controller_js_1 = require("./auth.controller.js");
const authMiddleware_js_1 = require("../../middleware/authMiddleware.js");
const router = express_1.default.Router();
const otpLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many OTP requests. Please try again later.",
    },
});
router.post("/send-otp", otpLimiter, auth_controller_js_1.sendOtpController);
router.post("/verify-otp", auth_controller_js_1.verifyOtpController);
router.post("/otp-verify", auth_controller_js_1.verifyOtpController);
router.post("/refresh", auth_controller_js_1.refreshTokenController);
router.get("/me", authMiddleware_js_1.protect, auth_controller_js_1.meController);
router.post("/logout", auth_controller_js_1.logoutController);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map