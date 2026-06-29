import { Request, Response } from "express";
import { getAuthUser, sendLoginOtp, verifyLoginOtp } from "./auth.service.js";
import { sendOtpSchema, verifyOtpSchema } from "./user.validation.js";

const isProduction = process.env.NODE_ENV === "production";

const accessCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" as const : "lax" as const,
  maxAge: Number(process.env.JWT_ACCESS_COOKIE_MS || 24 * 60 * 60 * 1000),
  path: "/",
};
console.log("sendOtp API called");
export const sendOtpController = async (req: Request, res: Response) => {
  try {
    const validation = sendOtpSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: validation.error.format(),
      });
    }

    const result = await sendLoginOtp(validation.data.email);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send OTP",
    });
  }
};

export const verifyOtpController = async (req: Request, res: Response) => {
  try {
    const validation = verifyOtpSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: validation.error.format(),
      });
    }

    const { user, accessToken } = await verifyLoginOtp(
      validation.data.email,
      validation.data.otp
    );

    res.cookie("accessToken", accessToken, accessCookieOptions);

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error: any) {
    const statusCode = ["Invalid OTP", "OTP expired or invalid. Please request a new OTP.", "Too many invalid attempts. Please request a new OTP."].includes(error.message)
      ? 400
      : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "OTP verification failed",
    });
  }
};

export const meController = async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(String(req.user?._id));

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      message: error.message || "Authentication required",
    });
  }
};

export const logoutController = async (_req: Request, res: Response) => {
  res.clearCookie("accessToken", {
    ...accessCookieOptions,
    maxAge: undefined,
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};
