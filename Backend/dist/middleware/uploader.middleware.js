"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const cloudinary_js_1 = __importDefault(require("../config/cloudinary.js"));
const storage = {
    _handleFile(_req, file, callback) {
        const chunks = [];
        file.stream.on("data", (chunk) => {
            chunks.push(chunk);
        });
        file.stream.on("error", callback);
        file.stream.on("end", () => {
            const buffer = Buffer.concat(chunks);
            const uploadStream = cloudinary_js_1.default.uploader.upload_stream({
                folder: "lubrimax",
                allowed_formats: ["jpg", "jpeg", "png"],
            }, (error, result) => {
                if (error) {
                    callback(error);
                    return;
                }
                if (!result?.secure_url) {
                    callback(new Error("Cloudinary upload failed"));
                    return;
                }
                callback(null, {
                    filename: result.public_id,
                    path: result.secure_url,
                    size: buffer.length,
                });
            });
            uploadStream.end(buffer);
        });
    },
    _removeFile(_req, _file, callback) {
        callback(null);
    },
};
const upload = (0, multer_1.default)({ storage });
exports.default = upload;
//# sourceMappingURL=uploader.middleware.js.map