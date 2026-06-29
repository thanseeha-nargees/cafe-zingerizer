"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
if (!accessSecret) {
    throw new Error("JWT_ACCESS_SECRET or JWT_SECRET is not configured");
}
if (!refreshSecret) {
    throw new Error("JWT_REFRESH_SECRET or JWT_SECRET is not configured");
}
const generateAccessToken = (userId, role) => {
    return jsonwebtoken_1.default.sign({ userId, role }, accessSecret, {
        expiresIn: "15m",
    });
};
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = (userId) => {
    return jsonwebtoken_1.default.sign({ userId }, refreshSecret, {
        expiresIn: "14d",
    });
};
exports.generateRefreshToken = generateRefreshToken;
//# sourceMappingURL=jwt.js.map