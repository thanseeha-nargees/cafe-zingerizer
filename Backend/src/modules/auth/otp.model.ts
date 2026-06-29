import { model, Schema } from "mongoose";

export interface IOtp {
  email: string;
  otpHash: string;
  attempts: number;
  expiresAt: Date;
  consumedAt?: Date;
}

const otpSchema = new Schema<IOtp>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    consumedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

otpSchema.index({ email: 1, consumedAt: 1 });

export const Otp = model<IOtp>("Otp", otpSchema);
