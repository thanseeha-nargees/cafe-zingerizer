import { Request, Response } from "express";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt.js";
import { User } from "../auth/user.schema.js";
import { loginSchema } from "../auth/user.validation.js";
import { comparePassword } from "../../utils/password.js";
import { saveUserRefreshToken } from "../auth/auth.service.js";

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

export const adminLoginController = async (req: Request, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: validation.error.format(),
      });
    }

    const { email, password } = validation.data;

    const admin = await User.findOne({
      email: email.trim().toLowerCase(),
      role: "admin",
      isActive: true,
    }).select("+password -__v");

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      });
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    const isPasswordValid = admin.password
      ? await comparePassword(password, admin.password)
      : Boolean(adminPassword && password === adminPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      });
    }

    const accessToken = generateAccessToken(String(admin._id), admin.role);
    const refreshToken = generateRefreshToken(String(admin._id));

    await saveUserRefreshToken(String(admin._id), refreshToken);

    res.cookie("accessToken", accessToken, accessCookieOptions);
    res.cookie("refreshToken", refreshToken, refreshCookieOptions);

    return res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: admin._id,
        userName: admin.userName,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Admin login failed",
    });
  }
};
