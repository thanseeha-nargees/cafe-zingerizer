import { Request, Response } from "express";
import {
  ORDER_STATUSES,
  OrderStatusUpdateError,
  isOrderStatus,
  isValidObjectId,
  updateOrderStatusWithSideEffects,
} from "../orders/order-status.service.js";
import { Order } from "../orders/order.model.js";

export const getAdminOrdersController = async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    const filters: Record<string, unknown> = {};

    if (typeof status === "string" && status !== "all") {
      if (!isOrderStatus(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order status",
        });
      }

      filters.orderStatus = status;
    }

    if (typeof search === "string" && search.trim()) {
      const term = search.trim();
      filters.$or = [
        { customerName: { $regex: term, $options: "i" } },
        { customerPhone: { $regex: term, $options: "i" } },
      ];
    }

    const orders = await Order.find(filters)
      .sort({ createdAt: -1 })
      .populate("items.menuItemId", "name category image price")
      .populate({
        path: "tableId",
        select: "tableNumber isActive isOccupied assignedStaff",
        populate: {
          path: "assignedStaff",
          select: "userName email role isActive",
        },
      })
      .populate("assignedStaff", "userName email role isActive")
      .populate("userId", "userName email")
      .lean();

    return res.status(200).json({
      success: true,
      orders,
      statuses: ORDER_STATUSES,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load orders",
    });
  }
};

export const updateAdminOrderStatusController = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    res.set("Cache-Control", "no-store");

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const nextStatus = req.body.orderStatus ?? req.body.status;

    if (!isOrderStatus(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const { order, foodReadySms } = await updateOrderStatusWithSideEffects(
      req.params.id,
      nextStatus
    );

    return res.status(200).json({
      success: true,
      order,
      foodReadySms,
      message:
        foodReadySms?.status === "failed"
          ? "Order status updated, but food ready SMS failed"
          : "Order status updated",
    });
  } catch (error: any) {
    if (error instanceof OrderStatusUpdateError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update order status",
    });
  }
};
