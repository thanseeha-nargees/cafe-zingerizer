import crypto from "crypto";
import { generateOtp } from "../../utils/generateOtp.js";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt.js";
import {
  probeBrevoConnectivity,
  sendOtpEmail,
} from "../../utils/email/sendOtpEmail.js";
import { Otp } from "./otp.model.js";
import { User } from "./user.schema.js";

const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES || 10);
const MAX_OTP_ATTEMPTS = Number(process.env.MAX_OTP_ATTEMPTS || 5);
const isProduction = process.env.NODE_ENV === "production";
const otpDeliveryMode = (process.env.OTP_DELIVERY_MODE || "email").toLowerCase();
const useConsoleOtpDelivery = otpDeliveryMode === "console";
const allowDevOtpFallback =
  !isProduction && process.env.ALLOW_DEV_OTP_FALLBACK !== "false";

export class OtpDeliveryError extends Error {
  constructor() {
    super("Unable to send OTP email right now. Please try again later.");
    this.name = "OtpDeliveryError";
  }
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const hashRefreshToken = (refreshToken: string) => {
  const pepper = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

  if (!pepper) {
    throw new Error("JWT_REFRESH_SECRET or JWT_SECRET is not configured");
  }

  return crypto
    .createHmac("sha256", pepper)
    .update(refreshToken)
    .digest("hex");
};

const hashOtp = (email: string, otp: string) => {
  const pepper = process.env.OTP_PEPPER || process.env.JWT_SECRET;

  if (!pepper) {
    throw new Error("OTP_PEPPER or JWT_SECRET is not configured");
  }

  return crypto
    .createHmac("sha256", pepper)
    .update(`${normalizeEmail(email)}:${otp}`)
    .digest("hex");
};

const buildUserName = (email: string) => {
  const localPart = email.split("@")[0] || "user";
  return localPart.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20) || "user";
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const logConsoleOtp = (email: string, otp: string, reason?: string) => {
  console.log("Login OTP for local development", {
    email,
    otp,
    expiresInMinutes: OTP_TTL_MINUTES,
    reason,
  });
};

const logOtpEmailError = (email: string, error: unknown) => {
  const err = error as {
    name?: string;
    message?: string;
    stack?: string;
    cause?: {
      name?: string;
      message?: string;
      stack?: string;
      code?: string;
    };
  };

  console.error("OTP email send failed", {
    email,
    name: err?.name,
    message: err?.message,
    stack: err?.stack,
    cause: err?.cause
      ? {
          name: err.cause.name,
          message: err.cause.message,
          stack: err.cause.stack,
          code: err.cause.code,
        }
      : undefined,
  });
};

export const sendLoginOtp = async (email: string) => {
  const normalizedEmail = normalizeEmail(email);
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await Otp.deleteMany({ email: normalizedEmail, consumedAt: { $exists: false } });
  await Otp.create({
    email: normalizedEmail,
    otpHash: hashOtp(normalizedEmail, otp),
    expiresAt,
  });

  if (useConsoleOtpDelivery) {
    logConsoleOtp(normalizedEmail, otp, "OTP_DELIVERY_MODE=console");
    return {
      message: "OTP generated. Check the backend terminal for the code.",
      expiresInMinutes: OTP_TTL_MINUTES,
    };
  }

  try {
    await sendOtpEmail(normalizedEmail, otp);
  } catch (error) {
    logOtpEmailError(normalizedEmail, error);

    if (error instanceof Error && error.message === "fetch failed") {
      try {
        const probe = await probeBrevoConnectivity();
        console.error("Brevo connectivity probe", {
          email: normalizedEmail,
          ...probe,
        });
      } catch (probeError) {
        const err = probeError as {
          name?: string;
          message?: string;
          stack?: string;
          cause?: {
            name?: string;
            message?: string;
            stack?: string;
            code?: string;
          };
        };

        console.error("Brevo connectivity probe failed", {
          email: normalizedEmail,
          name: err?.name,
          message: err?.message,
          stack: err?.stack,
          cause: err?.cause
            ? {
                name: err.cause.name,
                message: err.cause.message,
                stack: err.cause.stack,
                code: err.cause.code,
              }
            : undefined,
        });
      }
    }

    if (allowDevOtpFallback) {
      logConsoleOtp(normalizedEmail, otp, getErrorMessage(error));
      return {
        message: "OTP generated. Check the backend terminal for the code.",
        expiresInMinutes: OTP_TTL_MINUTES,
      };
    }

    throw new OtpDeliveryError();
  }

  return {
    message: "OTP sent to your email.",
    expiresInMinutes: OTP_TTL_MINUTES,
  };
};

export const verifyLoginOtp = async (email: string, otp: string) => {
  const normalizedEmail = normalizeEmail(email);
  const otpRecord = await Otp.findOne({
    email: normalizedEmail,
    consumedAt: { $exists: false },
  }).sort({ createdAt: -1 });

  if (!otpRecord || otpRecord.expiresAt.getTime() <= Date.now()) {
    throw new Error("OTP expired or invalid. Please request a new OTP.");
  }

  if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
    throw new Error("Too many invalid attempts. Please request a new OTP.");
  }

  const submittedHash = hashOtp(normalizedEmail, otp);

  if (
    !crypto.timingSafeEqual(
      Buffer.from(otpRecord.otpHash),
      Buffer.from(submittedHash)
    )
  ) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    throw new Error("Invalid OTP");
  }

  otpRecord.consumedAt = new Date();
  await otpRecord.save();

  const user = await User.findOneAndUpdate(
    { email: normalizedEmail },
    {
      $setOnInsert: {
        email: normalizedEmail,
        userName: buildUserName(normalizedEmail),
        role: "user",
        isActive: true,
        profileImage: "",
      },
      $set: {
        isVerified: true,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  const accessToken = generateAccessToken(String(user._id), user.role);
  const refreshToken = generateRefreshToken(String(user._id));

  user.refreshTokenHash = hashRefreshToken(refreshToken);
  await user.save();

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      userName: user.userName,
      email: user.email,
      role: user.role,
    },
  };
};

export const saveUserRefreshToken = async (
  userId: string,
  refreshToken: string
) => {
  await User.findByIdAndUpdate(userId, {
    refreshTokenHash: hashRefreshToken(refreshToken),
  });
};

export const clearUserRefreshToken = async (userId: string) => {
  await User.findByIdAndUpdate(userId, {
    refreshTokenHash: "",
  });
};

export const getAuthUser = async (userId: string) => {
  const user = await User.findById(userId).select("-__v");

  if (!user || !user.isActive) {
    throw new Error("User not found");
  }

  return {
    id: user._id,
    userName: user.userName,
    email: user.email,
    role: user.role,
  };
};
