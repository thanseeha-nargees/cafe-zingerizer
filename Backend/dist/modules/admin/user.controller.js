"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAdminUserController = exports.getAdminUsersController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const zod_1 = require("zod");
const user_schema_js_1 = require("../auth/user.schema.js");
const order_model_js_1 = require("../orders/order.model.js");
const updateAdminUserSchema = zod_1.z.object({
    userName: zod_1.z
        .string()
        .trim()
        .min(3, "Username must be at least 3 characters")
        .max(40, "Username cannot exceed 40 characters")
        .optional(),
    isActive: zod_1.z.boolean().optional(),
});
const isValidObjectId = (id) => mongoose_1.default.Types.ObjectId.isValid(id);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const getAdminUsersController = async (req, res) => {
    try {
        const { search, status } = req.query;
        const filters = { role: "user" };
        if (typeof search === "string" && search.trim()) {
            const term = escapeRegex(search.trim());
            filters.$or = [
                { userName: { $regex: term, $options: "i" } },
                { email: { $regex: term, $options: "i" } },
            ];
        }
        if (status === "active") {
            filters.isActive = true;
        }
        if (status === "inactive") {
            filters.isActive = false;
        }
        const [users, totalUsers, activeUsers] = await Promise.all([
            user_schema_js_1.User.find(filters)
                .select("-password -refreshTokenHash -__v")
                .sort({ createdAt: -1 })
                .lean(),
            user_schema_js_1.User.countDocuments({ role: "user" }),
            user_schema_js_1.User.countDocuments({ role: "user", isActive: true }),
        ]);
        const userIds = users.map((user) => user._id);
        const orderStats = userIds.length
            ? await order_model_js_1.Order.aggregate([
                { $match: { userId: { $in: userIds } } },
                {
                    $group: {
                        _id: "$userId",
                        orderCount: { $sum: 1 },
                        totalSpent: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$orderStatus", "COMPLETED"] },
                                    "$totalAmount",
                                    0,
                                ],
                            },
                        },
                        lastOrderAt: { $max: "$createdAt" },
                    },
                },
            ])
            : [];
        const statsByUserId = new Map(orderStats.map((stat) => [String(stat._id), stat]));
        const usersWithStats = users.map((user) => {
            const stats = statsByUserId.get(String(user._id));
            return {
                ...user,
                orderCount: stats?.orderCount || 0,
                totalSpent: stats?.totalSpent || 0,
                lastOrderAt: stats?.lastOrderAt || null,
            };
        });
        return res.status(200).json({
            success: true,
            users: usersWithStats,
            summary: {
                totalUsers,
                activeUsers,
                inactiveUsers: totalUsers - activeUsers,
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to load users",
        });
    }
};
exports.getAdminUsersController = getAdminUsersController;
const updateAdminUserController = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user id",
            });
        }
        const validation = updateAdminUserSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                errors: validation.error.format(),
                message: "Invalid user details",
            });
        }
        if (Object.keys(validation.data).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No user changes provided",
            });
        }
        const updatePayload = { ...validation.data };
        if (validation.data.isActive === false) {
            updatePayload.refreshTokenHash = "";
        }
        const user = await user_schema_js_1.User.findOneAndUpdate({ _id: req.params.id, role: "user" }, { $set: updatePayload }, { returnDocument: "after", runValidators: true })
            .select("-password -refreshTokenHash -__v")
            .lean();
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        return res.status(200).json({
            success: true,
            user,
            message: "User updated",
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update user",
        });
    }
};
exports.updateAdminUserController = updateAdminUserController;
//# sourceMappingURL=user.controller.js.map