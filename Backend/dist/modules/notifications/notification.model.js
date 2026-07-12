"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const notificationSchema = new mongoose_1.default.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true,
    },
    role: {
        type: String,
        enum: ["user", "admin", "staff"],
        required: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    message: {
        type: String,
        required: true,
        trim: true,
    },
    type: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    link: {
        type: String,
        default: "",
        trim: true,
    },
    metadata: {
        type: mongoose_1.default.Schema.Types.Mixed,
        default: {},
    },
    bookingId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Order",
        default: null,
        index: true,
    },
    userName: {
        type: String,
        default: "",
        trim: true,
    },
    serviceName: {
        type: String,
        default: "",
        trim: true,
    },
    bookingStatus: {
        type: String,
        default: "",
        trim: true,
    },
    bookingDateTime: {
        type: Date,
        default: null,
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true,
    },
    readAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ role: 1, createdAt: -1 });
exports.Notification = mongoose_1.default.model("Notification", notificationSchema);
//# sourceMappingURL=notification.model.js.map