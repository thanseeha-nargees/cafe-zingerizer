 import mongoose from "mongoose";

const tableSchema = new mongoose.Schema(
  {
    tableNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    qrCode: {
      type: String,
      default: "",
    },
    qrUrl: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isOccupied: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Table = mongoose.model("Table", tableSchema);
