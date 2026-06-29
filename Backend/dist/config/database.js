"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const connectDb = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGO_URL);
        console.log('mongodb connected');
    }
    catch (error) {
        console.log(error);
    }
};
exports.default = connectDb;
//# sourceMappingURL=database.js.map