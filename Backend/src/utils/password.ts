import bcrypt from "bcryptjs";

const PASSWORD_SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS || 10);

export const hashPassword = (password: string) => {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
};

export const comparePassword = (password: string, passwordHash: string) => {
  return bcrypt.compare(password, passwordHash);
};
