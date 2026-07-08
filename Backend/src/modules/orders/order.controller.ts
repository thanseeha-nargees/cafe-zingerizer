import { Request, Response } from "express";
import {
  createOrderService,
  getOrderByIdService,
  getMyOrdersService,
} from "./order.service.js";
import { createOrderSchema } from "./order.validation.js";

export const createOrderController = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const validation = createOrderSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.format(),
      });
    }

    const userId = req.user._id;
    const { orderType, tableId, customerName, customerPhone } = validation.data;

    const order = await createOrderService(
      userId,
      orderType,
      customerName,
      customerPhone,
      tableId
    );

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Something went wrong",
    });
  }
};

export const getMyOrdersController = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userId = req.user._id;

    const orders = await getMyOrdersService(userId);

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const getOrderByIdController = async (
  req: Request<{ orderId: string }>,
  res: Response
) => {
  try {
    const order = await getOrderByIdService(req.params.orderId);

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Order not found",
    });
  }
};
