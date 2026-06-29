"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutController = exports.meController = exports.verifyOtpController = exports.sendOtpController = void 0;
const auth_service_js_1 = require("./auth.service.js");
const user_validation_js_1 = require("./user.validation.js");
const isProduction = process.env.NODE_ENV === "production";
const accessCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: Number(process.env.JWT_ACCESS_COOKIE_MS || 24 * 60 * 60 * 1000),
    path: "/",
};
console.log("sendOtp API called");
const sendOtpController = async (req, res) => {
    try {
        const validation = user_validation_js_1.sendOtpSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                error: validation.error.format(),
            });
        }
        const result = await (0, auth_service_js_1.sendLoginOtp)(validation.data.email);
        return res.status(200).json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to send OTP",
        });
    }
};
exports.sendOtpController = sendOtpController;
const verifyOtpController = async (req, res) => {
    try {
        const validation = user_validation_js_1.verifyOtpSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                error: validation.error.format(),
            });
        }
        const { user, accessToken } = await (0, auth_service_js_1.verifyLoginOtp)(validation.data.email, validation.data.otp);
        res.cookie("accessToken", accessToken, accessCookieOptions);
        return res.status(200).json({
            success: true,
            user,
        });
    }
    catch (error) {
        const statusCode = ["Invalid OTP", "OTP expired or invalid. Please request a new OTP.", "Too many invalid attempts. Please request a new OTP."].includes(error.message)
            ? 400
            : 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || "OTP verification failed",
        });
    }
};
exports.verifyOtpController = verifyOtpController;
const meController = async (req, res) => {
    try {
        const user = await (0, auth_service_js_1.getAuthUser)(String(req.user?._id));
        return res.status(200).json({
            success: true,
            user,
        });
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            message: error.message || "Authentication required",
        });
    }
};
exports.meController = meController;
const logoutController = async (_req, res) => {
    res.clearCookie("accessToken", {
        ...accessCookieOptions,
        maxAge: undefined,
    });
    return res.status(200).json({
        success: true,
        message: "Logged out successfully",
    });
};
exports.logoutController = logoutController;
//# sourceMappingURL=auth.controller.js.map