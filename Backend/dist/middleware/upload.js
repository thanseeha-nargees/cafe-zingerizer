"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const cloudinary_js_1 = __importDefault(require("../config/cloudinary.js"));
const storage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_js_1.default,
    params: async () => ({
        folder: "cafe-menu",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
    }),
});
exports.upload = (0, multer_1.default)({ storage });
//# sourceMappingURL=upload.js.map