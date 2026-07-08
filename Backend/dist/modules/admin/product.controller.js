"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAdminProductController = exports.updateAdminProductController = exports.createAdminProductController = exports.getAdminProductController = exports.getAdminProductsController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const menu_schema_js_1 = require("../menu/menu.schema.js");
const menu_validation_js_1 = require("../menu/menu.validation.js");
const isValidObjectId = (id) => mongoose_1.default.Types.ObjectId.isValid(id);
const buildProductPayload = (req) => {
    const uploadedFile = req.file;
    const payload = {
        ...req.body,
    };
    if (uploadedFile?.path) {
        payload.image = uploadedFile.path;
    }
    return payload;
};
const getAdminProductsController = async (req, res) => {
    try {
        const { search, category, availability } = req.query;
        const filters = {};
        if (typeof search === "string" && search.trim()) {
            filters.$or = [
                { name: { $regex: search.trim(), $options: "i" } },
                { description: { $regex: search.trim(), $options: "i" } },
                { category: { $regex: search.trim(), $options: "i" } },
            ];
        }
        if (typeof category === "string" && category.trim()) {
            filters.category = category.trim();
        }
        if (availability === "available") {
            filters.isAvailable = true;
        }
        if (availability === "unavailable") {
            filters.isAvailable = false;
        }
        const products = await menu_schema_js_1.Menu.find(filters).sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            products,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getAdminProductsController = getAdminProductsController;
const getAdminProductController = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product id",
            });
        }
        const product = await menu_schema_js_1.Menu.findById(req.params.id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }
        return res.status(200).json({
            success: true,
            product,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getAdminProductController = getAdminProductController;
const createAdminProductController = async (req, res) => {
    try {
        const validation = menu_validation_js_1.createMenuSchema.safeParse(buildProductPayload(req));
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                errors: validation.error.format(),
            });
        }
        const product = await menu_schema_js_1.Menu.create(validation.data);
        return res.status(201).json({
            success: true,
            product,
            message: "Product created",
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.createAdminProductController = createAdminProductController;
const updateAdminProductController = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product id",
            });
        }
        const validation = menu_validation_js_1.updateMenuSchema.safeParse(buildProductPayload(req));
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                errors: validation.error.format(),
            });
        }
        const product = await menu_schema_js_1.Menu.findByIdAndUpdate(req.params.id, validation.data, {
            new: true,
            runValidators: true,
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }
        return res.status(200).json({
            success: true,
            product,
            message: "Product updated",
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.updateAdminProductController = updateAdminProductController;
const deleteAdminProductController = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product id",
            });
        }
        const product = await menu_schema_js_1.Menu.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Product deleted",
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.deleteAdminProductController = deleteAdminProductController;
//# sourceMappingURL=product.controller.js.map