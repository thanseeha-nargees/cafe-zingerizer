"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthUser = exports.verifyLoginOtp = exports.sendLoginOtp = void 0;
const crypto_1 = __importDefault(require("crypto"));
const generateOtp_js_1 = require("../../utils/generateOtp.js");
const jwt_js_1 = require("../../utils/jwt.js");
const sendOtpEmail_js_1 = require("../../utils/email/sendOtpEmail.js");
const otp_model_js_1 = require("./otp.model.js");
const user_schema_js_1 = require("./user.schema.js");
const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES || 10);
const MAX_OTP_ATTEMPTS = Number(process.env.MAX_OTP_ATTEMPTS || 5);
const normalizeEmail = (email) => email.trim().toLowerCase();
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
    // ;
    await (0, sendOtpEmail_js_1.sendOtpEmail)(normalizedEmail, otp);
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
    return {
        accessToken,
        user: {
            id: user._id,
            userName: user.userName,
            email: user.email,
            role: user.role,
        },
    };
};
exports.verifyLoginOtp = verifyLoginOtp;
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