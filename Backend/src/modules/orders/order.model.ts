import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: [
      {
        menuItemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Menu",
          required: true,
        },
        quantity: Number,
        price: Number,
      },
    ],

    orderType: {
      type: String,
      enum: ["Dining", "Takeaway"],
      required: true,
    },

    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      default: null,
    },

    tableNumber: {
      type: Number,
      default: null,
    },

    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    assignedStaffName: {
      type: String,
      trim: true,
      default: "",
    },

    assignedAt: {
      type: Date,
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

    totalAmount: {
      type: Number,
      required: true,
    },

    orderStatus: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "ACCEPTED",
        "PREPARING",
        "READY",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "PENDING",
    },

    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING",
    },

    paymentMethod: {
      type: String,
      enum: ["Online"],
      default: "Online",
    },

    paymentId: {
      type: String,
      trim: true,
      default: "",
    },

    razorpayOrderId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    transactionDate: {
      type: Date,
      default: null,
    },

    confirmedAt: {
      type: Date,
      default: null,
    },

    preparingStartedAt: {
      type: Date,
      default: null,
    },

    estimatedReadyAt: {
      type: Date,
      default: null,
      index: true,
    },

    foodReadyAt: {
      type: Date,
      default: null,
    },

    foodReadySmsSentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);
