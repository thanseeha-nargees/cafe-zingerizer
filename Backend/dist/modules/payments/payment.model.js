"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentSession = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const paymentSessionItemSchema = new mongoose_1.Schema({
    menuItemId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Menu",
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
}, { _id: false });
const paymentSessionSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    orderId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Order",
        default: null,
    },
    razorpayOrderId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    razorpayPaymentId: {
        type: String,
        trim: true,
        default: "",
    },
    razorpaySignature: {
        type: String,
        trim: true,
        default: "",
    },
    amount: {
        type: Number,
        required: true,
    },
    amountInRupees: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        default: "INR",
    },
    status: {
        type: String,
        enum: ["CREATED", "PAID", "FAILED"],
        default: "CREATED",
        index: true,
    },
    orderType: {
        type: String,
        enum: ["Dining", "Takeaway"],
        required: true,
    },
    tableId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Table",
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
    items: [paymentSessionItemSchema],
    failureReason: {
        type: String,
        trim: true,
        default: "",
    },
    transactionDate: {
        type: Date,
        default: null,
    },
}, { timestamps: true });
exports.PaymentSession = mongoose_1.default.model("PaymentSession", paymentSessionSchema);
//# sourceMappingURL=payment.model.js.map