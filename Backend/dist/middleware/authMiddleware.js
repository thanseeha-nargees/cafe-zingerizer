"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_schema_1 = require("../modules/auth/user.schema");
const protect = async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken;
        if (!token) {
            return res.status(401).json({ message: "Authentication required" });
        }
        const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
        if (!secret) {
            return res.status(500).json({ success: false, message: "JWT secret is not configured" });
        }
        const decode = jsonwebtoken_1.default.verify(token, secret);
        const user = await user_schema_1.User.findById(decode.userId).select("-password");
        if (!user || !user.isActive) {
            return res.status(401).json({ success: false, message: 'User no longer exists or is inactive' });
        }
        req.user = { _id: String(user._id), role: user.role };
        next();
    }
    catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};
exports.protect = protect;
const authorize = (roles) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user || !roles.includes(user.role)) {
            return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
        }
        next();
    };
};
exports.authorize = authorize;
//# sourceMappingURL=authMiddleware.js.map