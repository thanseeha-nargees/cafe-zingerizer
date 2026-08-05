"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.generateRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const getJwtSecret = (primaryName, fallbackName) => {
    const primarySecret = process.env[primaryName]?.trim();
    const fallbackSecret = process.env[fallbackName]?.trim();
    if (primarySecret)
        return primarySecret;
    if (fallbackSecret)
        return fallbackSecret;
    throw new Error(`${primaryName} or ${fallbackName} is not configured`);
};
const accessSecret = getJwtSecret("JWT_ACCESS_SECRET", "JWT_SECRET");
const refreshSecret = getJwtSecret("JWT_REFRESH_SECRET", "JWT_SECRET");
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
const verifyRefreshToken = (token) => {
    return jsonwebtoken_1.default.verify(token, refreshSecret);
};
exports.verifyRefreshToken = verifyRefreshToken;
//# sourceMappingURL=jwt.js.map