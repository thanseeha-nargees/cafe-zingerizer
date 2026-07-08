import { Request, Response } from "express";
import mongoose from "mongoose";
import { notifyOrderReady } from "../notifications/orderReady.websocket.js";
import { clearScheduledFoodReadyNotification } from "../orders/order.scheduler.js";
import {
  sendFoodReadySmsOnce,
  type FoodReadySmsResult,
} from "../orders/order.sms.js";
import { Table } from "../table/table.model.js";
import { Order } from "../orders/order.model.js";

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];
type FoodReadySmsResponse =
  | FoodReadySmsResult
  | {
      status: "failed";
      error: string;
    };

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const isOrderStatus = (status: unknown): status is OrderStatus =>
  typeof status === "string" && ORDER_STATUSES.includes(status as OrderStatus);

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

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
      .populate("tableId", "tableNumber isActive isOccupied")
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

    const existingOrder = await Order.findById(req.params.id).select(
      "orderStatus"
    );

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const previousStatus = existingOrder.orderStatus;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: { orderStatus: nextStatus } },
      { new: true, runValidators: true }
    )
      .populate("items.menuItemId", "name category image price")
      .populate("tableId", "tableNumber isActive isOccupied")
      .populate("userId", "userName email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (
      ["COMPLETED", "CANCELLED"].includes(nextStatus) &&
      order.tableId &&
      order.orderType === "Dining"
    ) {
      const tableId =
        typeof order.tableId === "object" && "_id" in order.tableId
          ? order.tableId._id
          : order.tableId;

      await Table.findByIdAndUpdate(tableId, { isOccupied: false });

      await order.populate("tableId", "tableNumber isActive isOccupied");
    }

    let foodReadySms: FoodReadySmsResponse | null = null;

    if (nextStatus === "READY" && previousStatus !== "READY") {
      notifyOrderReady(order);

      try {
        foodReadySms = await sendFoodReadySmsOnce(order);

        await clearScheduledFoodReadyNotification(String(order._id)).catch(
          (error) => {
            console.log(
              "food ready notification queue cleanup failed",
              getErrorMessage(error)
            );
          }
        );
      } catch (error) {
        foodReadySms = {
          status: "failed",
          error: getErrorMessage(error),
        };

        console.log(
          "food ready SMS failed",
          JSON.stringify({
            orderId: String(order._id),
            error: foodReadySms.error,
          })
        );
      }
    }

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
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update order status",
    });
  }
};
