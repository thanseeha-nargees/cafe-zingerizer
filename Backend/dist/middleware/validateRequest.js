"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const validateRequest = (schema, type = "body") => {
    return (req, res, next) => {
        const result = schema.safeParse(req[type]);
        if (!result.success) {
            const errors = result.error.issues.map((err) => ({
                field: err.path.join("."),
                message: err.message,
            }));
            console.log(errors);
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors,
            });
        }
        req[type] = result.data;
        next();
    };
};
exports.validateRequest = validateRequest;
//# sourceMappingURL=validateRequest.js.map