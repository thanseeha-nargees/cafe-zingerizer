import crypto from "crypto";
import { generateOtp } from "../../utils/generateOtp.js";
import { generateAccessToken } from "../../utils/jwt.js";
import { sendOtpEmail } from "../../utils/email/sendOtpEmail.js";
import { Otp } from "./otp.model.js";
import { User } from "./user.schema.js";

const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES || 10);
const MAX_OTP_ATTEMPTS = Number(process.env.MAX_OTP_ATTEMPTS || 5);

const normalizeEmail = (email: string) => email.trim().toLowerCase();

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
// ;
  await sendOtpEmail(normalizedEmail, otp)

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

  return {
    accessToken,
    user: {
      id: user._id,
      userName: user.userName,
      email: user.email,
      role: user.role,
    },
  };
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
