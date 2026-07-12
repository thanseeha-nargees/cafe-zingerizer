import { Cart } from "../cart/cart.schema.js";
import { Table } from "../table/table.model.js";
import { Order } from "./order.model.js";
import { CreateOrderInput } from "./order.types.js";
import { createOrderLifecycleNotifications } from "../notifications/notification.service.js";
import { notifyOrderCreated } from "../notifications/orderReady.websocket.js";

type PaidOrderItem = {
  menuItemId: string;
  quantity: number;
  price: number;
};

type OrderPaymentMetadata = {
  paymentMethod: "Online";
  paymentStatus: "PAID";
  paymentId: string;
  razorpayOrderId: string;
  transactionDate: Date;
};

type CreateOrderOptions = {
  items?: PaidOrderItem[];
  payment?: OrderPaymentMetadata;
};

export const createOrderService = async (
  userId: string,
  orderType: CreateOrderInput["orderType"],
  customerName: string,
  customerPhone: string,
  tableId?: string,
  options: CreateOrderOptions = {}
) => {
  let selectedTable = null;

  if (orderType === "Dining") {
    selectedTable = await Table.findOne({
      _id: tableId,
      isActive: true,
    });

    if (!selectedTable) {
      throw new Error("Selected table is not valid");
    }
  }

  const cart = options.items
    ? null
    : await Cart.findOne({ userId }).populate("items.menuItemId");

  if ((!cart || cart.items.length === 0) && !options.items?.length) {
    throw new Error("Cart is empty");
  }

  const orderItems =
    options.items?.map((item) => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      price: item.price,
    })) ||
    cart!.items.map((item: any) => {
      const menuItem = item.menuItemId;

      if (!menuItem?.price) {
        throw new Error("Menu item not found");
      }

      return {
        menuItemId: menuItem._id,
        quantity: item.quantity,
        price: menuItem.price,
      };
    });

  const totalAmount = orderItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const isPaidOrder = options.payment?.paymentStatus === "PAID";
  const confirmedAt = isPaidOrder
    ? options.payment?.transactionDate || new Date()
    : null;

  const order = await Order.create({
    userId,
    items: orderItems,
    orderType,
    tableId: orderType === "Dining" ? tableId : null,
    tableNumber: selectedTable?.tableNumber ?? null,
    assignedStaff: selectedTable?.assignedStaff ?? null,
    customerName,
    customerPhone,
    totalAmount,
    orderStatus: isPaidOrder ? "CONFIRMED" : "PENDING",
    paymentMethod: options.payment?.paymentMethod || "Online",
    paymentStatus: options.payment?.paymentStatus || "PENDING",
    paymentId: options.payment?.paymentId || "",
    razorpayOrderId: options.payment?.razorpayOrderId || "",
    transactionDate: options.payment?.transactionDate || null,
    confirmedAt,
  });

  if (selectedTable) {
    selectedTable.isOccupied = true;
    await selectedTable.save();
  }

  if (cart) {
    cart.set("items", []);
    await cart.save();
  } else {
    await Cart.updateOne({ userId }, { $set: { items: [] } });
  }

  await order.populate("items.menuItemId", "name category image price");
  await order.populate({
    path: "tableId",
    select: "tableNumber isActive isOccupied assignedStaff",
    populate: {
      path: "assignedStaff",
      select: "userName email role isActive",
    },
  });
  await order.populate("assignedStaff", "userName email role isActive");
  await order.populate("userId", "userName email");

  await createOrderLifecycleNotifications(order);
  notifyOrderCreated(order);

  return order;
};

export const getMyOrdersService = async (
  userId: string
) => {
  return await Order.find({ userId }).sort({
    createdAt: -1,
  });
};

export const getOrderByIdService = async (orderId: string) => {
  const order = await Order.findById(orderId)
    .populate("items.menuItemId")
    .populate("tableId")
    .populate("userId", "userName email");

  if (!order) {
    throw new Error("Order not found");
  }

  return order;
};
