import { User } from "./user.schema.js";
import { hashPassword } from "../../utils/password.js";

const DEFAULT_SUPER_ADMIN_EMAIL = "admin@gmail.com";
const DEFAULT_SUPER_ADMIN_PASSWORD = "Admin@123";

export const ensureDefaultSuperAdmin = async () => {
  const adminExists = await User.exists({ role: "admin" });

  if (adminExists) {
    return;
  }

  const defaultEmailExists = await User.exists({
    email: DEFAULT_SUPER_ADMIN_EMAIL,
  });

  if (defaultEmailExists) {
    console.log(
      "default super admin was not created because admin@gmail.com already exists"
    );
    return;
  }

  const password = await hashPassword(DEFAULT_SUPER_ADMIN_PASSWORD);

  await User.create({
    userName: "Super Admin",
    email: DEFAULT_SUPER_ADMIN_EMAIL,
    password,
    role: "admin",
    phoneNumber: "",
    profileImage: "",
    isActive: true,
    isVerified: true,
  });

  console.log("default super admin created for development");
};
