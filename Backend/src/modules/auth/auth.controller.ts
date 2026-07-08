import { Request, Response } from "express";
import {
  clearUserRefreshToken,
  getAuthUser,
  hashRefreshToken,
  OtpDeliveryError,
  saveUserRefreshToken,
  sendLoginOtp,
  verifyLoginOtp,
} from "./auth.service.js";
import { sendOtpSchema, verifyOtpSchema } from "./user.validation.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt.js";
import { User } from "./user.schema.js";

const isProduction = process.env.NODE_ENV === "production";

const accessCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" as const : "lax" as const,
  maxAge: Number(process.env.JWT_ACCESS_COOKIE_MS || 15 * 60 * 1000),
  path: "/",
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" as const : "lax" as const,
  maxAge: Number(process.env.JWT_REFRESH_COOKIE_MS || 14 * 24 * 60 * 60 * 1000),
  path: "/",
};

const clearAuthCookies = (res: Response) => {
  res.clearCookie("accessToken", {
    ...accessCookieOptions,
    maxAge: undefined,
  });
  res.clearCookie("refreshToken", {
    ...refreshCookieOptions,
    maxAge: undefined,
  });
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
    const isOtpDeliveryError = error instanceof OtpDeliveryError;

    return res.status(isOtpDeliveryError ? 503 : 500).json({
      success: false,
      message: isOtpDeliveryError
        ? error.message
        : error.message || "Failed to send OTP",
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

    const { user, accessToken, refreshToken } = await verifyLoginOtp(
      validation.data.email,
      validation.data.otp
    );

    res.cookie("accessToken", accessToken, accessCookieOptions);
    res.cookie("refreshToken", refreshToken, refreshCookieOptions);

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

export const refreshTokenController = async (req: Request, res: Response) => {
  try {
    const currentRefreshToken = req.cookies?.refreshToken;

    if (!currentRefreshToken) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: "Refresh token required",
      });
    }

    const decoded = verifyRefreshToken(currentRefreshToken);
    const user = await User.findById(decoded.userId).select(
      "+refreshTokenHash role isActive"
    );

    if (!user || !user.isActive || !user.refreshTokenHash) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    if (user.refreshTokenHash !== hashRefreshToken(currentRefreshToken)) {
      await clearUserRefreshToken(String(user._id));
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const accessToken = generateAccessToken(String(user._id), user.role);
    const refreshToken = generateRefreshToken(String(user._id));

    await saveUserRefreshToken(String(user._id), refreshToken);

    res.cookie("accessToken", accessToken, accessCookieOptions);
    res.cookie("refreshToken", refreshToken, refreshCookieOptions);

    return res.status(200).json({
      success: true,
      message: "Token refreshed",
    });
  } catch (error) {
    clearAuthCookies(res);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
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

export const logoutController = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      const decoded = verifyRefreshToken(refreshToken);
      await clearUserRefreshToken(decoded.userId);
    }
  } catch {
    // Expired or malformed refresh cookies are still cleared below.
  }

  clearAuthCookies(res);

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};
