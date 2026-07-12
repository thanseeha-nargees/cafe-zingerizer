"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushSubscription = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const pushSubscriptionSchema = new mongoose_1.default.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    role: {
        type: String,
        enum: ["user", "admin", "staff"],
        required: true,
        index: true,
    },
    endpoint: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    keys: {
        p256dh: {
            type: String,
            required: true,
        },
        auth: {
            type: String,
            required: true,
        },
    },
    userAgent: {
        type: String,
        default: "",
    },
}, { timestamps: true });
exports.PushSubscription = mongoose_1.default.model("PushSubscription", pushSubscriptionSchema);
//# sourceMappingURL=pushSubscription.model.js.map