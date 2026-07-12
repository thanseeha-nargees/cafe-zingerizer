import { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { User } from "../auth/user.schema.js";
import { Order } from "../orders/order.model.js";

const updateAdminUserSchema = z.object({
  userName: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(40, "Username cannot exceed 40 characters")
    .optional(),
  isActive: z.boolean().optional(),
});

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getAdminUsersController = async (req: Request, res: Response) => {
  try {
    const { search, status } = req.query;
    const filters: Record<string, unknown> = { role: "user" };

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
      User.find(filters)
        .select("-password -refreshTokenHash -__v")
        .sort({ createdAt: -1 })
        .lean(),
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "user", isActive: true }),
    ]);

    const userIds = users.map((user) => user._id);
    const orderStats = userIds.length
      ? await Order.aggregate([
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

    const statsByUserId = new Map(
      orderStats.map((stat) => [String(stat._id), stat])
    );

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
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load users",
    });
  }
};

export const updateAdminUserController = async (
  req: Request<{ id: string }>,
  res: Response
) => {
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

    const updatePayload: Record<string, unknown> = { ...validation.data };

    if (validation.data.isActive === false) {
      updatePayload.refreshTokenHash = "";
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: "user" },
      { $set: updatePayload },
      { returnDocument: "after", runValidators: true }
    )
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
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update user",
    });
  }
};
