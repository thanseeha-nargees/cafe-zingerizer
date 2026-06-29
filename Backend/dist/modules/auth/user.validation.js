"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.verifyForgotOtpSchema = exports.forgotPasswordSchema = exports.loginSchema = exports.verifyOtpSchema = exports.registerSchema = exports.sendOtpSchema = void 0;
const zod_1 = require("zod");
const strictEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|in|org|net|edu|co)$/;
exports.sendOtpSchema = zod_1.z.object({
    email: zod_1.z.string()
        .email("Invalid email format")
        .regex(strictEmailRegex, "Invalid email")
});
exports.registerSchema = zod_1.z.object({
    userName: zod_1.z.string().min(3, "Username must be at least 3 characters").max(20, "Username cannot exceed 20 characters"),
    email: zod_1.z.string()
        .email("Invalid email format")
        .regex(strictEmailRegex, "Email must end with a valid domain extension like .com, .in, or .org"),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
    role: zod_1.z.enum(['user', 'admin']).default("user"),
    phoneNumber: zod_1.z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format").optional()
});
exports.verifyOtpSchema = zod_1.z.object({
    email: zod_1.z.string()
        .email("Invalid email format")
        .regex(strictEmailRegex, "Invalid email"),
    otp: zod_1.z.string().regex(/^\d{6}$/, "OTP must be exactly 6 digits")
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string()
        .email("Invalid email format")
        .regex(strictEmailRegex, "Invalid email"),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters")
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string()
        .email("Invalid email format")
        .regex(strictEmailRegex, "Invalid email")
});
exports.verifyForgotOtpSchema = zod_1.z.object({
    email: zod_1.z.string()
        .email("Invalid email format")
        .regex(strictEmailRegex, "Invalid email"),
    otp: zod_1.z.string().length(6)
});
exports.resetPasswordSchema = zod_1.z.object({
    email: zod_1.z.string()
        .email("Invalid email format")
        .regex(strictEmailRegex, "Invalid email"),
    newPassword: zod_1.z.string().min(8)
});
//# sourceMappingURL=user.validation.js.map