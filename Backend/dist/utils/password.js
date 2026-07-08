"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.comparePassword = exports.hashPassword = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const PASSWORD_SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS || 10);
const hashPassword = (password) => {
    return bcryptjs_1.default.hash(password, PASSWORD_SALT_ROUNDS);
};
exports.hashPassword = hashPassword;
const comparePassword = (password, passwordHash) => {
    return bcryptjs_1.default.compare(password, passwordHash);
};
exports.comparePassword = comparePassword;
//# sourceMappingURL=password.js.map