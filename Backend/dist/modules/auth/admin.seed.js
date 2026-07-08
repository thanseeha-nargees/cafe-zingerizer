"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDefaultSuperAdmin = void 0;
const user_schema_js_1 = require("./user.schema.js");
const password_js_1 = require("../../utils/password.js");
const DEFAULT_SUPER_ADMIN_EMAIL = "admin@gmail.com";
const DEFAULT_SUPER_ADMIN_PASSWORD = "Admin@123";
const ensureDefaultSuperAdmin = async () => {
    const adminExists = await user_schema_js_1.User.exists({ role: "admin" });
    if (adminExists) {
        return;
    }
    const defaultEmailExists = await user_schema_js_1.User.exists({
        email: DEFAULT_SUPER_ADMIN_EMAIL,
    });
    if (defaultEmailExists) {
        console.log("default super admin was not created because admin@gmail.com already exists");
        return;
    }
    const password = await (0, password_js_1.hashPassword)(DEFAULT_SUPER_ADMIN_PASSWORD);
    await user_schema_js_1.User.create({
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
exports.ensureDefaultSuperAdmin = ensureDefaultSuperAdmin;
//# sourceMappingURL=admin.seed.js.map