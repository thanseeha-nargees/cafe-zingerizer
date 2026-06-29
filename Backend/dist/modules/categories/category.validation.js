"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCategorySchema = void 0;
const zod_1 = require("zod");
exports.createCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name is required"),
    slug: zod_1.z.string().min(2, "Slug is required"),
    image: zod_1.z.string().min(1, "Image is required"),
});
//# sourceMappingURL=category.validation.js.map