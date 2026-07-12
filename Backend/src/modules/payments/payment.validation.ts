import { z } from "zod";
import { createOrderSchema } from "../orders/order.validation.js";

export const createRazorpayOrderSchema = createOrderSchema;

export const verifyRazorpayPaymentSchema = z.object({
  razorpayOrderId: z.string().trim().min(1, "Razorpay order id is required"),
  razorpayPaymentId: z.string().trim().min(1, "Razorpay payment id is required"),
  razorpaySignature: z.string().trim().min(1, "Payment signature is required"),
});

export const markRazorpayPaymentFailedSchema = z.object({
  razorpayOrderId: z.string().trim().min(1, "Razorpay order id is required"),
  reason: z.string().trim().max(500).optional(),
});
