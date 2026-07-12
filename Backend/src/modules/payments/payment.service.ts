import crypto from "crypto";
import { Cart } from "../cart/cart.schema.js";
import { Order } from "../orders/order.model.js";
import { createOrderService } from "../orders/order.service.js";
import { CreateOrderInput } from "../orders/order.types.js";
import { Table } from "../table/table.model.js";
import { PaymentSession } from "./payment.model.js";

type CreatePaymentOrderInput = {
  orderType: CreateOrderInput["orderType"];
  customerName: string;
  customerPhone: string;
  tableId?: string;
};

type VerifyPaymentInput = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

type CartSnapshotItem = {
  menuItemId: string;
  quantity: number;
  price: number;
};

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  status?: string;
};

const getRazorpayCredentials = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured");
  }

  return { keyId, keySecret };
};

const getRazorpayAuthHeader = (keyId: string, keySecret: string) =>
  `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

const buildCartSnapshot = async (userId: string) => {
  const cart = await Cart.findOne({ userId }).populate("items.menuItemId");

  if (!cart || cart.items.length === 0) {
    throw new Error("Cart is empty");
  }

  const items = cart.items.map((item: any) => {
    const menuItem = item.menuItemId;
    const quantity = Number(item.quantity || 0);
    const price = Number(menuItem?.price || 0);

    if (!menuItem?._id || quantity <= 0 || price <= 0) {
      throw new Error("Menu item not found");
    }

    return {
      menuItemId: String(menuItem._id),
      quantity,
      price,
    };
  });

  const totalAmount = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  if (totalAmount <= 0) {
    throw new Error("Cart total must be greater than zero");
  }

  return { items, totalAmount };
};

const validateDiningTable = async (orderType: string, tableId?: string) => {
  if (orderType !== "Dining") return null;

  const table = await Table.findOne({
    _id: tableId,
    isActive: true,
  });

  if (!table) {
    throw new Error("Selected table is not valid");
  }

  return table;
};

const createRazorpayOrder = async (
  amount: number,
  currency: string,
  receipt: string,
  notes: Record<string, string>
) => {
  const { keyId, keySecret } = getRazorpayCredentials();

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: getRazorpayAuthHeader(keyId, keySecret),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      currency,
      receipt,
      notes,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as any;

  if (!response.ok) {
    throw new Error(
      payload?.error?.description ||
        payload?.message ||
        "Unable to create Razorpay order"
    );
  }

  return payload as RazorpayOrderResponse;
};

const verifySignature = (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
) => {
  const { keySecret } = getRazorpayCredentials();
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(razorpaySignature);

  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
};

const getPopulatedOrder = (orderId: string) =>
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

export const createRazorpayOrderService = async (
  userId: string,
  input: CreatePaymentOrderInput,
  userEmail?: string
) => {
  const { keyId } = getRazorpayCredentials();
  await validateDiningTable(input.orderType, input.tableId);

  const { items, totalAmount } = await buildCartSnapshot(userId);
  const amount = Math.round(totalAmount * 100);
  const currency = "INR";
  const receipt = `rcpt_${Date.now().toString(36)}_${userId.slice(-8)}`;
  const razorpayOrder = await createRazorpayOrder(amount, currency, receipt, {
    userId,
    orderType: input.orderType,
  });

  const paymentSession = await PaymentSession.create({
    userId,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount || amount,
    amountInRupees: totalAmount,
    currency: razorpayOrder.currency || currency,
    orderType: input.orderType,
    tableId: input.orderType === "Dining" ? input.tableId : null,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    items,
  });

  return {
    session: paymentSession,
    payment: {
      keyId,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount || amount,
      currency: razorpayOrder.currency || currency,
      name: process.env.RAZORPAY_CHECKOUT_NAME || "Cafe Management System",
      description: "Prepaid cafe order",
      prefill: {
        name: input.customerName,
        email: userEmail || "",
        contact: input.customerPhone,
      },
    },
  };
};

export const verifyRazorpayPaymentService = async (
  userId: string,
  input: VerifyPaymentInput
) => {
  const session = await PaymentSession.findOne({
    userId,
    razorpayOrderId: input.razorpayOrderId,
  });

  if (!session) {
    throw new Error("Payment session not found");
  }

  if (session.status === "PAID" && session.orderId) {
    const existingOrder = await getPopulatedOrder(String(session.orderId));

    if (existingOrder) {
      return { order: existingOrder, session };
    }
  }

  if (
    !verifySignature(
      input.razorpayOrderId,
      input.razorpayPaymentId,
      input.razorpaySignature
    )
  ) {
    session.status = "FAILED";
    session.failureReason = "Invalid Razorpay payment signature";
    await session.save();
    throw new Error("Payment verification failed");
  }

  const transactionDate = new Date();
  const orderItems = session.items.map((item: any): CartSnapshotItem => ({
    menuItemId: String(item.menuItemId),
    quantity: Number(item.quantity),
    price: Number(item.price),
  }));

  const order = await createOrderService(
    userId,
    session.orderType,
    session.customerName,
    session.customerPhone,
    session.tableId ? String(session.tableId) : undefined,
    {
      items: orderItems,
      payment: {
        paymentMethod: "Online",
        paymentStatus: "PAID",
        paymentId: input.razorpayPaymentId,
        razorpayOrderId: input.razorpayOrderId,
        transactionDate,
      },
    }
  );

  session.status = "PAID";
  session.orderId = order._id;
  session.razorpayPaymentId = input.razorpayPaymentId;
  session.razorpaySignature = input.razorpaySignature;
  session.transactionDate = transactionDate;
  session.failureReason = "";
  await session.save();

  return { order, session };
};

export const markRazorpayPaymentFailedService = async (
  userId: string,
  razorpayOrderId: string,
  reason = "Payment failed or was cancelled"
) => {
  const session = await PaymentSession.findOne({
    userId,
    razorpayOrderId,
    status: "CREATED",
  });

  if (!session) return null;

  session.status = "FAILED";
  session.failureReason = reason;
  await session.save();

  return session;
};
