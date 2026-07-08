"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMenuSchema = exports.createMenuSchema = void 0;
const zod_1 = require("zod");
const optionalBooleanFromFormData = zod_1.z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    if (typeof value === "string") {
        if (value === "true") {
            return true;
        }
        if (value === "false") {
            return false;
        }
    }
    return value;
}, zod_1.z.boolean().optional());
exports.createMenuSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name is required"),
    description: zod_1.z.string().optional(),
    price: zod_1.z.coerce.number().min(1, "Price must be greater than 0"),
    category: zod_1.z.string().min(1, "Category is required"),
    image: zod_1.z.string().optional(),
    isAvailable: optionalBooleanFromFormData,
});
exports.updateMenuSchema = exports.createMenuSchema.partial().refine((data) => Object.keys(data).length > 0, "At least one product field is required");
//# sourceMappingURL=menu.validation.js.map