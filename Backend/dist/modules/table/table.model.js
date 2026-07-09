"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Table = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const tableSchema = new mongoose_1.default.Schema({
    tableNumber: {
        type: Number,
        required: true,
        unique: true,
    },
    qrCode: {
        type: String,
        default: "",
    },
    qrUrl: {
        type: String,
        default: "",
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    isOccupied: {
        type: Boolean,
        default: false,
    },
    assignedStaff: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true,
    },
}, {
    timestamps: true,
});
exports.Table = mongoose_1.default.model("Table", tableSchema);
//# sourceMappingURL=table.model.js.map