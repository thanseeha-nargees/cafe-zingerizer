"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImage = void 0;
const uploadImage = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            imageUrl: req.file.path,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.uploadImage = uploadImage;
//# sourceMappingURL=upload.controller.js.map