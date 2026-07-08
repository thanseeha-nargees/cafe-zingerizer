"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const notificationSchema = new mongoose_1.default.Schema({
    bookingId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Order",
        required: true,
        index: true,
    },
    userName: {
        type: String,
        required: true,
        trim: true,
    },
    serviceName: {
        type: String,
        required: true,
        trim: true,
    },
    bookingStatus: {
        type: String,
        required: true,
        trim: true,
    },
    bookingDateTime: {
        type: Date,
        required: true,
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
exports.Notification = mongoose_1.default.model("Notification", notificationSchema);
//# sourceMappingURL=notification.model.js.map