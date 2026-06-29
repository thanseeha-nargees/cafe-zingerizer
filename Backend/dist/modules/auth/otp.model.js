"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Otp = void 0;
const mongoose_1 = require("mongoose");
const otpSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    otpHash: {
        type: String,
        required: true,
    },
    attempts: {
        type: Number,
        default: 0,
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 },
    },
    consumedAt: {
        type: Date,
    },
}, { timestamps: true });
otpSchema.index({ email: 1, consumedAt: 1 });
exports.Otp = (0, mongoose_1.model)("Otp", otpSchema);
//# sourceMappingURL=otp.model.js.map