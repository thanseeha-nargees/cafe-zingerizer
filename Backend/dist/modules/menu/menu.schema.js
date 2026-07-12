"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Menu = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const menuSchema = new mongoose_1.default.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: "",
    },
    price: {
        type: Number,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        default: "",
    },
    isAvailable: {
        type: Boolean,
        default: true,
    },
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
    },
    reviewCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    ratingBreakdown: {
        one: {
            type: Number,
            default: 0,
        },
        two: {
            type: Number,
            default: 0,
        },
        three: {
            type: Number,
            default: 0,
        },
        four: {
            type: Number,
            default: 0,
        },
        five: {
            type: Number,
            default: 0,
        },
    },
}, {
    timestamps: true,
});
exports.Menu = mongoose_1.default.model("Menu", menuSchema);
//# sourceMappingURL=menu.schema.js.map