"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutController = exports.meController = exports.refreshTokenController = exports.verifyOtpController = exports.sendOtpController = void 0;
const auth_service_js_1 = require("./auth.service.js");
const user_validation_js_1 = require("./user.validation.js");
const jwt_js_1 = require("../../utils/jwt.js");
const user_schema_js_1 = require("./user.schema.js");
const isProduction = process.env.NODE_ENV === "production";
const accessCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: Number(process.env.JWT_ACCESS_COOKIE_MS || 15 * 60 * 1000),
    path: "/",
};
const refreshCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: Number(process.env.JWT_REFRESH_COOKIE_MS || 14 * 24 * 60 * 60 * 1000),
    path: "/",
};
const clearAuthCookies = (res) => {
    res.clearCookie("accessToken", {
        ...accessCookieOptions,
        maxAge: undefined,
    });
    res.clearCookie("refreshToken", {
        ...refreshCookieOptions,
        maxAge: undefined,
    });
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
        const isOtpDeliveryError = error instanceof auth_service_js_1.OtpDeliveryError;
        return res.status(isOtpDeliveryError ? 503 : 500).json({
            success: false,
            message: isOtpDeliveryError
                ? error.message
                : error.message || "Failed to send OTP",
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
        const { user, accessToken, refreshToken } = await (0, auth_service_js_1.verifyLoginOtp)(validation.data.email, validation.data.otp);
        res.cookie("accessToken", accessToken, accessCookieOptions);
        res.cookie("refreshToken", refreshToken, refreshCookieOptions);
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
const refreshTokenController = async (req, res) => {
    try {
        const currentRefreshToken = req.cookies?.refreshToken;
        if (!currentRefreshToken) {
            clearAuthCookies(res);
            return res.status(401).json({
                success: false,
                message: "Refresh token required",
            });
        }
        const decoded = (0, jwt_js_1.verifyRefreshToken)(currentRefreshToken);
        const user = await user_schema_js_1.User.findById(decoded.userId).select("+refreshTokenHash role isActive");
        if (!user || !user.isActive || !user.refreshTokenHash) {
            clearAuthCookies(res);
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token",
            });
        }
        if (user.refreshTokenHash !== (0, auth_service_js_1.hashRefreshToken)(currentRefreshToken)) {
            await (0, auth_service_js_1.clearUserRefreshToken)(String(user._id));
            clearAuthCookies(res);
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token",
            });
        }
        const accessToken = (0, jwt_js_1.generateAccessToken)(String(user._id), user.role);
        const refreshToken = (0, jwt_js_1.generateRefreshToken)(String(user._id));
        await (0, auth_service_js_1.saveUserRefreshToken)(String(user._id), refreshToken);
        res.cookie("accessToken", accessToken, accessCookieOptions);
        res.cookie("refreshToken", refreshToken, refreshCookieOptions);
        return res.status(200).json({
            success: true,
            message: "Token refreshed",
        });
    }
    catch (error) {
        clearAuthCookies(res);
        return res.status(401).json({
            success: false,
            message: "Invalid or expired refresh token",
        });
    }
};
exports.refreshTokenController = refreshTokenController;
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
const logoutController = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (refreshToken) {
            const decoded = (0, jwt_js_1.verifyRefreshToken)(refreshToken);
            await (0, auth_service_js_1.clearUserRefreshToken)(decoded.userId);
        }
    }
    catch {
        // Expired or malformed refresh cookies are still cleared below.
    }
    clearAuthCookies(res);
    return res.status(200).json({
        success: true,
        message: "Logged out successfully",
    });
};
exports.logoutController = logoutController;
//# sourceMappingURL=auth.controller.js.map