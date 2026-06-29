import { Cart } from "../cart/cart.schema.js";
import { Table } from "../table/table.model.js";
import { Order } from "./order.model.js";
import {
  getFoodReadyAt,
  scheduleFoodReadyNotification,
} from "./order.scheduler.js";
import { CreateOrderInput } from "./order.types.js";

export const createOrderService = async (
  userId: string,
  orderType: CreateOrderInput["orderType"],
  customerName: string,
  customerPhone: string,
  tableId?: string
) => {
  let selectedTable = null;

  if (orderType === "Dining") {
    selectedTable = await Table.findOne({
      _id: tableId,
      isActive: true,
      isOccupied: false,
    });

    if (!selectedTable) {
      throw new Error("Selected table is not available");
    }
  }

  const cart = await Cart.findOne({ userId }).populate("items.menuItemId");

  if (!cart || cart.items.length === 0) {
    throw new Error("Cart is empty");
  }

  const orderItems = cart.items.map((item: any) => {
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

  const foodReadyAt = getFoodReadyAt();

  const order = await Order.create({
    userId,
    items: orderItems,
    orderType,
    tableId: orderType === "Dining" ? tableId : null,
    customerName,
    customerPhone,
    totalAmount,
    foodReadyAt,
  });

  await scheduleFoodReadyNotification(order._id.toString(), foodReadyAt);

  if (selectedTable) {
    selectedTable.isOccupied = true;
    await selectedTable.save();
  }

  cart.set("items", []);
  await cart.save();

  return order;
};

export const getMyOrdersService = async (
  userId: string
) => {
  return await Order.find({ userId }).sort({
    createdAt: -1,
  });
};
