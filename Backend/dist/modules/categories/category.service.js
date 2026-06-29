"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.getCategoryById = exports.getAllCategories = exports.createCategory = void 0;
const category_schema_js_1 = require("./category.schema.js");
const createCategory = async (data) => {
    return await category_schema_js_1.Category.create(data);
};
exports.createCategory = createCategory;
const getAllCategories = async () => {
    return await category_schema_js_1.Category.find().sort({ createdAt: -1 });
};
exports.getAllCategories = getAllCategories;
const getCategoryById = async (id) => {
    return await category_schema_js_1.Category.findById(id);
};
exports.getCategoryById = getCategoryById;
const deleteCategory = async (id) => {
    return await category_schema_js_1.Category.findByIdAndDelete(id);
};
exports.deleteCategory = deleteCategory;
//# sourceMappingURL=category.service.js.map