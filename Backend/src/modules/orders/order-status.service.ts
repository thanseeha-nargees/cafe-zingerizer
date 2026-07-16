import mongoose from "mongoose";
import {
  notifyOrderAssigned,
  notifyOrderReady,
  notifyOrderStatusUpdated,
} from "../notifications/orderReady.websocket.js";
import { createOrderStatusNotifications } from "../notifications/notification.service.js";
import { User } from "../auth/user.schema.js";
import { Table } from "../table/table.model.js";
import { Order } from "./order.model.js";
import {
  clearScheduledFoodReadyNotification,
  getEstimatedReadyAt,
  scheduleFoodReadyNotification,
} from "./order.scheduler.js";
import {
  sendFoodReadySmsOnce,
  type FoodReadySmsResult,
} from "./order.sms.js";

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "ACCEPTED",
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

export class OrderAssignmentError extends Error {
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

const populateOrderForResponse = (orderId: string) =>
  Order.findById(orderId)
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
    .populate("userId", "userName email");

export const acceptTakeawayOrderForStaff = async (
  orderId: string,
  staffId: string
) => {
  const staff = await User.findOne({
    _id: staffId,
    role: "staff",
    isActive: true,
  })
    .select("userName email role isActive")
    .lean();

  if (!staff) {
    throw new OrderAssignmentError("Active staff member not found", 404);
  }

  const assignedAt = new Date();
  const previousOrder = await Order.findOneAndUpdate(
    {
      _id: orderId,
      orderType: "Takeaway",
      assignedStaff: null,
      orderStatus: { $in: ["PENDING", "CONFIRMED"] },
    },
    {
      $set: {
        assignedStaff: staff._id,
        assignedStaffName: staff.userName,
        assignedAt,
        orderStatus: "ACCEPTED",
      },
    },
    {
      returnDocument: "before",
      runValidators: true,
    }
  ).select("orderStatus");

  if (!previousOrder) {
    const existingOrder = await Order.findById(orderId)
      .select("orderType assignedStaff orderStatus")
      .lean();

    if (!existingOrder) {
      throw new OrderAssignmentError("Order not found", 404);
    }

    if (existingOrder.orderType !== "Takeaway") {
      throw new OrderAssignmentError("Only Takeaway orders can be accepted", 400);
    }

    if (existingOrder.assignedStaff) {
      throw new OrderAssignmentError("Order already assigned", 409);
    }

    throw new OrderAssignmentError("Order cannot be accepted in its current status", 400);
  }

  const order = await populateOrderForResponse(orderId);

  if (!order) {
    throw new OrderAssignmentError("Order not found", 404);
  }

  await createOrderStatusNotifications(
    order,
    "ACCEPTED",
    previousOrder.orderStatus as OrderStatus
  );
  notifyOrderAssigned(order);

  return order;
};

export const updateOrderStatusWithSideEffects = async (
  orderId: string,
  nextStatus: OrderStatus
) => {
  if (nextStatus === "ACCEPTED") {
    throw new OrderStatusUpdateError(
      "Use staff order acceptance to accept Takeaway orders",
      400
    );
  }

  const existingOrder = await Order.findById(orderId).select("orderStatus");

  if (!existingOrder) {
    throw new OrderStatusUpdateError("Order not found", 404);
  }

  const previousStatus = existingOrder.orderStatus as OrderStatus;
  const statusUpdate: Record<string, unknown> = { orderStatus: nextStatus };
  
  const shouldStartPreparationTimer =
    nextStatus === "PREPARING" && previousStatus !== "PREPARING";
  const shouldClearPreparationTimer =
    previousStatus === "PREPARING" && nextStatus !== "PREPARING";

  if (shouldStartPreparationTimer) {
    const preparingStartedAt = new Date();
    const estimatedReadyAt = getEstimatedReadyAt(preparingStartedAt);

    statusUpdate.preparingStartedAt = preparingStartedAt;
    statusUpdate.estimatedReadyAt = estimatedReadyAt;
    statusUpdate.foodReadyAt = estimatedReadyAt;
    statusUpdate.foodReadySmsSentAt = null;
  }

  const order = await Order.findByIdAndUpdate(
    orderId,
    { $set: statusUpdate },
    { returnDocument: "after", runValidators: true }
  )
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
    .populate("userId", "userName email");

  if (!order) {
    throw new OrderStatusUpdateError("Order not found", 404);
  }

  if (shouldStartPreparationTimer && order.estimatedReadyAt) {
    await scheduleFoodReadyNotification(
      String(order._id),
      order.estimatedReadyAt
    ).catch((error) => {
      console.log(
        "food ready notification queue schedule failed",
        getErrorMessage(error)
      );
    });
  } else if (shouldClearPreparationTimer) {
    await clearScheduledFoodReadyNotification(String(order._id)).catch(
      (error) => {
        console.log(
          "food ready notification queue cleanup failed",
          getErrorMessage(error)
        );
      }
    );
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
    await order.populate({
      path: "tableId",
      select: "tableNumber isActive isOccupied assignedStaff",
      populate: {
        path: "assignedStaff",
        select: "userName email role isActive",
      },
    });
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

  await createOrderStatusNotifications(order, nextStatus, previousStatus);
  notifyOrderStatusUpdated(order);

  return { order, foodReadySms };
};
