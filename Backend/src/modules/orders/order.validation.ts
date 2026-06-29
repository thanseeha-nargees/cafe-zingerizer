import { z } from "zod";

export const createOrderSchema = z.object({
  orderType: z
    .enum(["Dining", "Takeaway", "DINE_IN", "TAKEAWAY"])
    .transform((value) => {
      if (value === "DINE_IN") return "Dining";
      if (value === "TAKEAWAY") return "Takeaway";
      return value;
    }),

  tableId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid table id")
    .optional(),

  customerName: z.string().trim().min(1, "Customer name is required"),

  customerPhone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Phone number must be a valid 10-digit mobile number"),
}).superRefine((data, ctx) => {
  if (data.orderType === "Dining" && !data.tableId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Table selection is required for Dining orders",
      path: ["tableId"],
    });
  }
});
