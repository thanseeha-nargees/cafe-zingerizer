"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Review = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const reviewSchema = new mongoose_1.default.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    productId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Menu",
        required: true,
        index: true,
    },
    orderId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Order",
        required: true,
        index: true,
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    review: {
        type: String,
        trim: true,
        default: "",
        maxlength: 1000,
    },
    isHidden: {
        type: Boolean,
        default: false,
        index: true,
    },
}, { timestamps: true });
reviewSchema.index({ userId: 1, productId: 1, orderId: 1 }, { unique: true });
exports.Review = mongoose_1.default.model("Review", reviewSchema);
//# sourceMappingURL=review.model.js.map