import mongoose from "mongoose";
import { notifyOrderReady } from "../notifications/orderReady.websocket.js";
import { Table } from "../table/table.model.js";
import { Order } from "./order.model.js";
import { clearScheduledFoodReadyNotification } from "./order.scheduler.js";
import {
  sendFoodReadySmsOnce,
  type FoodReadySmsResult,
} from "./order.sms.js";

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type FoodReadySmsResponse =
  | FoodReadySmsResult
  | {
      status: "failed";
      error: string;
    };

export class OrderStatusUpdateError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export const isOrderStatus = (status: unknown): status is OrderStatus =>
  typeof status === "string" && ORDER_STATUSES.includes(status as OrderStatus);

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const updateOrderStatusWithSideEffects = async (
  orderId: string,
  nextStatus: OrderStatus
) => {
  const existingOrder = await Order.findById(orderId).select("orderStatus");

  if (!existingOrder) {
    throw new OrderStatusUpdateError("Order not found", 404);
  }

  const previousStatus = existingOrder.orderStatus as OrderStatus;
  const order = await Order.findByIdAndUpdate(
    orderId,
    { $set: { orderStatus: nextStatus } },
    { new: true, runValidators: true }
  )
    .populate("items.menuItemId", "name category image price")
    .populate("tableId", "tableNumber isActive isOccupied assignedStaff")
    .populate("userId", "userName email");

  if (!order) {
    throw new OrderStatusUpdateError("Order not found", 404);
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
    await order.populate("tableId", "tableNumber isActive isOccupied assignedStaff");
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

  return { order, foodReadySms };
};
