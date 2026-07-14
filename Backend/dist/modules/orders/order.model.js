"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Order = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const orderSchema = new mongoose_1.default.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    items: [
        {
            menuItemId: {
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: "Menu",
                required: true,
            },
            quantity: Number,
            price: Number,
        },
    ],
    orderType: {
        type: String,
        enum: ["Dining", "Takeaway"],
        required: true,
    },
    tableId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Table",
        default: null,
    },
    tableNumber: {
        type: Number,
        default: null,
    },
    assignedStaff: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true,
    },
    assignedStaffName: {
        type: String,
        trim: true,
        default: "",
    },
    assignedAt: {
        type: Date,
        default: null,
    },
    customerName: {
        type: String,
        required: true,
        trim: true,
    },
    customerPhone: {
        type: String,
        required: true,
        trim: true,
    },
    totalAmount: {
        type: Number,
        required: true,
    },
    orderStatus: {
        type: String,
        enum: [
            "PENDING",
            "CONFIRMED",
            "ACCEPTED",
            "PREPARING",
            "READY",
            "COMPLETED",
            "CANCELLED",
        ],
        default: "PENDING",
    },
    paymentStatus: {
        type: String,
        enum: ["PENDING", "PAID"],
        default: "PENDING",
    },
    paymentMethod: {
        type: String,
        enum: ["Online"],
        default: "Online",
    },
    paymentId: {
        type: String,
        trim: true,
        default: "",
    },
    razorpayOrderId: {
        type: String,
        trim: true,
        default: "",
        index: true,
    },
    transactionDate: {
        type: Date,
        default: null,
    },
    confirmedAt: {
        type: Date,
        default: null,
    },
    preparingStartedAt: {
        type: Date,
        default: null,
    },
    estimatedReadyAt: {
        type: Date,
        default: null,
        index: true,
    },
    foodReadyAt: {
        type: Date,
        default: null,
    },
    foodReadySmsSentAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });
exports.Order = mongoose_1.default.model("Order", orderSchema);
//# sourceMappingURL=order.model.js.map