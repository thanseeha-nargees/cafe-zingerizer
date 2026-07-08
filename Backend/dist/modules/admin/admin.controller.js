"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminLoginController = void 0;
const jwt_js_1 = require("../../utils/jwt.js");
const user_schema_js_1 = require("../auth/user.schema.js");
const user_validation_js_1 = require("../auth/user.validation.js");
const password_js_1 = require("../../utils/password.js");
const auth_service_js_1 = require("../auth/auth.service.js");
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
const adminLoginController = async (req, res) => {
    try {
        const validation = user_validation_js_1.loginSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                error: validation.error.format(),
            });
        }
        const { email, password } = validation.data;
        const admin = await user_schema_js_1.User.findOne({
            email: email.trim().toLowerCase(),
            role: "admin",
            isActive: true,
        }).select("+password -__v");
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin credentials",
            });
        }
        const adminPassword = process.env.ADMIN_PASSWORD;
        const isPasswordValid = admin.password
            ? await (0, password_js_1.comparePassword)(password, admin.password)
            : Boolean(adminPassword && password === adminPassword);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin credentials",
            });
        }
        const accessToken = (0, jwt_js_1.generateAccessToken)(String(admin._id), admin.role);
        const refreshToken = (0, jwt_js_1.generateRefreshToken)(String(admin._id));
        await (0, auth_service_js_1.saveUserRefreshToken)(String(admin._id), refreshToken);
        res.cookie("accessToken", accessToken, accessCookieOptions);
        res.cookie("refreshToken", refreshToken, refreshCookieOptions);
        return res.status(200).json({
            success: true,
            accessToken,
            user: {
                id: admin._id,
                userName: admin.userName,
                email: admin.email,
                role: admin.role,
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Admin login failed",
        });
    }
};
exports.adminLoginController = adminLoginController;
//# sourceMappingURL=admin.controller.js.map