"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthUser = exports.clearUserRefreshToken = exports.saveUserRefreshToken = exports.verifyLoginOtp = exports.sendLoginOtp = exports.hashRefreshToken = exports.OtpDeliveryError = void 0;
const crypto_1 = __importDefault(require("crypto"));
const generateOtp_js_1 = require("../../utils/generateOtp.js");
const jwt_js_1 = require("../../utils/jwt.js");
const sendOtpEmail_js_1 = require("../../utils/email/sendOtpEmail.js");
const otp_model_js_1 = require("./otp.model.js");
const user_schema_js_1 = require("./user.schema.js");
const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES || 10);
const MAX_OTP_ATTEMPTS = Number(process.env.MAX_OTP_ATTEMPTS || 5);
const isProduction = process.env.NODE_ENV === "production";
const otpDeliveryMode = (process.env.OTP_DELIVERY_MODE || "email").toLowerCase();
const useConsoleOtpDelivery = otpDeliveryMode === "console";
const allowDevOtpFallback = !isProduction && process.env.ALLOW_DEV_OTP_FALLBACK !== "false";
class OtpDeliveryError extends Error {
    constructor() {
        super("Unable to send OTP email right now. Please try again later.");
        this.name = "OtpDeliveryError";
    }
}
exports.OtpDeliveryError = OtpDeliveryError;
const normalizeEmail = (email) => email.trim().toLowerCase();
const hashRefreshToken = (refreshToken) => {
    const pepper = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!pepper) {
        throw new Error("JWT_REFRESH_SECRET or JWT_SECRET is not configured");
    }
    return crypto_1.default
        .createHmac("sha256", pepper)
        .update(refreshToken)
        .digest("hex");
};
exports.hashRefreshToken = hashRefreshToken;
const hashOtp = (email, otp) => {
    const pepper = process.env.OTP_PEPPER || process.env.JWT_SECRET;
    if (!pepper) {
        throw new Error("OTP_PEPPER or JWT_SECRET is not configured");
    }
    return crypto_1.default
        .createHmac("sha256", pepper)
        .update(`${normalizeEmail(email)}:${otp}`)
        .digest("hex");
};
const buildUserName = (email) => {
    const localPart = email.split("@")[0] || "user";
    return localPart.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20) || "user";
};
const getErrorMessage = (error) => error instanceof Error ? error.message : String(error);
const logConsoleOtp = (email, otp, reason) => {
    console.log("Login OTP for local development", {
        email,
        otp,
        expiresInMinutes: OTP_TTL_MINUTES,
        reason,
    });
};
const logOtpEmailError = (email, error) => {
    const err = error;
    console.error("OTP email send failed", {
        email,
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
        cause: err?.cause
            ? {
                name: err.cause.name,
                message: err.cause.message,
                stack: err.cause.stack,
                code: err.cause.code,
            }
            : undefined,
    });
};
const sendLoginOtp = async (email) => {
    const normalizedEmail = normalizeEmail(email);
    const otp = (0, generateOtp_js_1.generateOtp)();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    await otp_model_js_1.Otp.deleteMany({ email: normalizedEmail, consumedAt: { $exists: false } });
    await otp_model_js_1.Otp.create({
        email: normalizedEmail,
        otpHash: hashOtp(normalizedEmail, otp),
        expiresAt,
    });
    if (useConsoleOtpDelivery) {
        logConsoleOtp(normalizedEmail, otp, "OTP_DELIVERY_MODE=console");
        return {
            message: "OTP generated. Check the backend terminal for the code.",
            expiresInMinutes: OTP_TTL_MINUTES,
        };
    }
    try {
        await (0, sendOtpEmail_js_1.sendOtpEmail)(normalizedEmail, otp);
    }
    catch (error) {
        logOtpEmailError(normalizedEmail, error);
        if (error instanceof Error && error.message === "fetch failed") {
            try {
                const probe = await (0, sendOtpEmail_js_1.probeBrevoConnectivity)();
                console.error("Brevo connectivity probe", {
                    email: normalizedEmail,
                    ...probe,
                });
            }
            catch (probeError) {
                const err = probeError;
                console.error("Brevo connectivity probe failed", {
                    email: normalizedEmail,
                    name: err?.name,
                    message: err?.message,
                    stack: err?.stack,
                    cause: err?.cause
                        ? {
                            name: err.cause.name,
                            message: err.cause.message,
                            stack: err.cause.stack,
                            code: err.cause.code,
                        }
                        : undefined,
                });
            }
        }
        if (allowDevOtpFallback) {
            logConsoleOtp(normalizedEmail, otp, getErrorMessage(error));
            return {
                message: "OTP generated. Check the backend terminal for the code.",
                expiresInMinutes: OTP_TTL_MINUTES,
            };
        }
        throw new OtpDeliveryError();
    }
    return {
        message: "OTP sent to your email.",
        expiresInMinutes: OTP_TTL_MINUTES,
    };
};
exports.sendLoginOtp = sendLoginOtp;
const verifyLoginOtp = async (email, otp) => {
    const normalizedEmail = normalizeEmail(email);
    const otpRecord = await otp_model_js_1.Otp.findOne({
        email: normalizedEmail,
        consumedAt: { $exists: false },
    }).sort({ createdAt: -1 });
    if (!otpRecord || otpRecord.expiresAt.getTime() <= Date.now()) {
        throw new Error("OTP expired or invalid. Please request a new OTP.");
    }
    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
        throw new Error("Too many invalid attempts. Please request a new OTP.");
    }
    const submittedHash = hashOtp(normalizedEmail, otp);
    if (!crypto_1.default.timingSafeEqual(Buffer.from(otpRecord.otpHash), Buffer.from(submittedHash))) {
        otpRecord.attempts += 1;
        await otpRecord.save();
        throw new Error("Invalid OTP");
    }
    otpRecord.consumedAt = new Date();
    await otpRecord.save();
    const user = await user_schema_js_1.User.findOneAndUpdate({ email: normalizedEmail }, {
        $setOnInsert: {
            email: normalizedEmail,
            userName: buildUserName(normalizedEmail),
            role: "user",
            isActive: true,
            profileImage: "",
        },
        $set: {
            isVerified: true,
        },
    }, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
    });
    const accessToken = (0, jwt_js_1.generateAccessToken)(String(user._id), user.role);
    const refreshToken = (0, jwt_js_1.generateRefreshToken)(String(user._id));
    user.refreshTokenHash = (0, exports.hashRefreshToken)(refreshToken);
    await user.save();
    return {
        accessToken,
        refreshToken,
        user: {
            id: user._id,
            userName: user.userName,
            email: user.email,
            role: user.role,
        },
    };
};
exports.verifyLoginOtp = verifyLoginOtp;
const saveUserRefreshToken = async (userId, refreshToken) => {
    await user_schema_js_1.User.findByIdAndUpdate(userId, {
        refreshTokenHash: (0, exports.hashRefreshToken)(refreshToken),
    });
};
exports.saveUserRefreshToken = saveUserRefreshToken;
const clearUserRefreshToken = async (userId) => {
    await user_schema_js_1.User.findByIdAndUpdate(userId, {
        refreshTokenHash: "",
    });
};
exports.clearUserRefreshToken = clearUserRefreshToken;
const getAuthUser = async (userId) => {
    const user = await user_schema_js_1.User.findById(userId).select("-__v");
    if (!user || !user.isActive) {
        throw new Error("User not found");
    }
    return {
        id: user._id,
        userName: user.userName,
        email: user.email,
        role: user.role,
    };
};
exports.getAuthUser = getAuthUser;
//# sourceMappingURL=auth.service.js.map