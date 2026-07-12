import mongoose, { Schema } from "mongoose";

const paymentSessionItemSchema = new Schema(
  {
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: "Menu",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const paymentSessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
      default: "",
    },
    razorpaySignature: {
      type: String,
      trim: true,
      default: "",
    },
    amount: {
      type: Number,
      required: true,
    },
    amountInRupees: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["CREATED", "PAID", "FAILED"],
      default: "CREATED",
      index: true,
    },
    orderType: {
      type: String,
      enum: ["Dining", "Takeaway"],
      required: true,
    },
    tableId: {
      type: Schema.Types.ObjectId,
      ref: "Table",
      default: null,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    items: [paymentSessionItemSchema],
    failureReason: {
      type: String,
      trim: true,
      default: "",
    },
    transactionDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const PaymentSession = mongoose.model(
  "PaymentSession",
  paymentSessionSchema
);
