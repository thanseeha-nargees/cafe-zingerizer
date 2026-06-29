"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategoryController = exports.getCategoryController = exports.getCategoriesController = exports.createCategoryController = void 0;
const category_validation_js_1 = require("./category.validation.js");
const category_service_js_1 = require("./category.service.js");
const createCategoryController = async (req, res) => {
    try {
        const uploadedFile = req.file;
        const payload = {
            ...req.body,
            image: uploadedFile?.path || req.body.image,
        };
        const validation = category_validation_js_1.createCategorySchema.safeParse(payload);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                errors: validation.error.format(),
            });
        }
        const category = await (0, category_service_js_1.createCategory)(validation.data);
        return res.status(201).json({
            success: true,
            category,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.createCategoryController = createCategoryController;
const getCategoriesController = async (req, res) => {
    const categories = await (0, category_service_js_1.getAllCategories)();
    return res.status(200).json({
        success: true,
        categories,
    });
};
exports.getCategoriesController = getCategoriesController;
const getCategoryController = async (req, res) => {
    const category = await (0, category_service_js_1.getCategoryById)(req.params.id);
    return res.status(200).json({
        success: true,
        category,
    });
};
exports.getCategoryController = getCategoryController;
const deleteCategoryController = async (req, res) => {
    await (0, category_service_js_1.deleteCategory)(req.params.id);
    return res.status(200).json({
        success: true,
        message: "Category deleted",
    });
};
exports.deleteCategoryController = deleteCategoryController;
//# sourceMappingURL=category.controller.js.map