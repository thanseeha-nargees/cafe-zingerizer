"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const connectDb = async () => {
    const mongoUrl = process.env.MONGO_URL?.trim();
    if (!mongoUrl) {
        throw new Error("MONGO_URL is not configured");
    }
    try {
        await mongoose_1.default.connect(mongoUrl);
        console.log('mongodb connected');
    }
    catch (error) {
        console.log("mongodb connection failed", error instanceof Error ? error.message : error);
        throw error;
    }
};
exports.default = connectDb;
//# sourceMappingURL=database.js.map