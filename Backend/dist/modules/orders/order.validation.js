"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrderSchema = void 0;
const zod_1 = require("zod");
exports.createOrderSchema = zod_1.z.object({
    orderType: zod_1.z
        .enum(["Dining", "Takeaway", "DINE_IN", "TAKEAWAY"])
        .transform((value) => {
        if (value === "DINE_IN")
            return "Dining";
        if (value === "TAKEAWAY")
            return "Takeaway";
        return value;
    }),
    tableId: zod_1.z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, "Invalid table id")
        .optional(),
    customerName: zod_1.z.string().trim().min(1, "Customer name is required"),
    customerPhone: zod_1.z
        .string()
        .trim()
        .regex(/^[6-9]\d{9}$/, "Phone number must be a valid 10-digit mobile number"),
}).superRefine((data, ctx) => {
    if (data.orderType === "Dining" && !data.tableId) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "Table selection is required for Dining orders",
            path: ["tableId"],
        });
    }
});
//# sourceMappingURL=order.validation.js.map