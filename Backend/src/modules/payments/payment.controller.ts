import { Request, Response } from "express";
import { User } from "../auth/user.schema.js";
import {
  createRazorpayOrderService,
  markRazorpayPaymentFailedService,
  verifyRazorpayPaymentService,
} from "./payment.service.js";
import {
  createRazorpayOrderSchema,
  markRazorpayPaymentFailedSchema,
  verifyRazorpayPaymentSchema,
} from "./payment.validation.js";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const ensureCustomer = (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return false;
  }

  if (req.user.role !== "user") {
    res.status(403).json({
      success: false,
      message: "Only customers can make payments",
    });
    return false;
  }

  return true;
};

export const createRazorpayOrderController = async (
  req: Request,
  res: Response
) => {
  try {
    if (!ensureCustomer(req, res)) return;

    const validation = createRazorpayOrderSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: validation.error.format(),
      });
    }

    const user = await User.findById(req.user!._id).select("email").lean();
    const result = await createRazorpayOrderService(
      req.user!._id,
      validation.data,
      user?.email || ""
    );

    return res.status(201).json({
      success: true,
      payment: result.payment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error, "Unable to create payment order"),
    });
  }
};

export const verifyRazorpayPaymentController = async (
  req: Request,
  res: Response
) => {
  try {
    if (!ensureCustomer(req, res)) return;

    const validation = verifyRazorpayPaymentSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: validation.error.format(),
      });
    }

    const { order } = await verifyRazorpayPaymentService(
      req.user!._id,
      validation.data
    );

    return res.status(201).json({
      success: true,
      message: "Payment verified and order created",
      data: order,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error, "Payment verification failed"),
    });
  }
};

export const markRazorpayPaymentFailedController = async (
  req: Request,
  res: Response
) => {
  try {
    if (!ensureCustomer(req, res)) return;

    const validation = markRazorpayPaymentFailedSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: validation.error.format(),
      });
    }

    await markRazorpayPaymentFailedService(
      req.user!._id,
      validation.data.razorpayOrderId,
      validation.data.reason
    );

    return res.status(200).json({
      success: true,
      message: "Payment failure recorded",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error, "Unable to record payment failure"),
    });
  }
};
