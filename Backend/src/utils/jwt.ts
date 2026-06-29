import jwt from "jsonwebtoken";

const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

if (!accessSecret) {
  throw new Error("JWT_ACCESS_SECRET or JWT_SECRET is not configured");
}

if (!refreshSecret) {
  throw new Error("JWT_REFRESH_SECRET or JWT_SECRET is not configured");
}

export const generateAccessToken = (
  userId: string,
  role: string
) => {
  return jwt.sign(
    { userId, role },
    accessSecret,
    {
      expiresIn: "15m",
    }
  );
};

export const generateRefreshToken = (
  userId: string
) => {
  return jwt.sign(
    { userId },
    refreshSecret,
    {
      expiresIn: "14d",
    }
  );
};