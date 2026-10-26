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
        console.log("mongodb connected");
    }
    catch (error) {
        console.log("mongodb connection failed", error instanceof Error ? error.message : error);
        // If remote Atlas cluster domain does not exist, try local MongoDB fallback
        if (error instanceof Error && error.message.includes("ENOTFOUND") && !mongoUrl.includes("127.0.0.1") && !mongoUrl.includes("localhost")) {
            console.log("[MongoDB] Remote cluster unreachable (ENOTFOUND). Attempting fallback to local MongoDB (mongodb://127.0.0.1:27017/Cafe)...");
            try {
                await mongoose_1.default.connect("mongodb://127.0.0.1:27017/Cafe");
                console.log("[MongoDB] Connected successfully to local MongoDB!");
                return;
            }
            catch (localErr) {
                console.log("[MongoDB] Local fallback failed:", localErr instanceof Error ? localErr.message : localErr);
            }
        }
        throw error;
    }
};
exports.default = connectDb;
//# sourceMappingURL=database.js.map