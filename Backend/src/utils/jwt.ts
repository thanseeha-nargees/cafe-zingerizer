import jwt from "jsonwebtoken";

const getJwtSecret = (primaryName: string, fallbackName: string) => {
  const primarySecret = process.env[primaryName]?.trim();
  const fallbackSecret = process.env[fallbackName]?.trim();

  if (primarySecret) return primarySecret;
  if (fallbackSecret) return fallbackSecret;

  throw new Error(`${primaryName} or ${fallbackName} is not configured`);
};

const accessSecret = getJwtSecret("JWT_ACCESS_SECRET", "JWT_SECRET");
const refreshSecret = getJwtSecret("JWT_REFRESH_SECRET", "JWT_SECRET");

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

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, refreshSecret) as { userId: string };
};
