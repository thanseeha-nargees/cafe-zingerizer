import { Request, Response } from "express";
import { User } from "../auth/user.schema.js";
import { Menu } from "../menu/menu.schema.js";
import { Order } from "../orders/order.model.js";

export const getAdminDashboardController = async (
  req: Request,
  res: Response
) => {
  try {
    res.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayRange = { $gte: today, $lt: tomorrow };

    const activeOrderStatuses = [
      "PENDING",
      "CONFIRMED",
      "PREPARING",
      "READY",
    ] as const;
    const revenueOrderFilter = {
      orderStatus: { $ne: "CANCELLED" },
    };

    const [
      totalStaff,
      totalUsers,
      totalProducts,
      totalOrders,
      revenue,
      todaysRevenue,
      todaysOrders,
      pendingOrders,
      activeOrders,
      completedOrders,
      cancelledOrders,
      orderStatusBreakdown,
      topSellingItems,
      recentOrders,
    ] = await Promise.all([
      User.countDocuments({ role: { $in: ["admin", "staff"] } }),
      User.countDocuments({ role: "user" }),
      Menu.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([
        { $match: revenueOrderFilter },
        { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
      ]),
      Order.aggregate([
        {
          $match: {
            ...revenueOrderFilter,
            createdAt: todayRange,
          },
        },
        { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
      ]),
      Order.countDocuments({ createdAt: todayRange }),
      Order.countDocuments({ orderStatus: "PENDING" }),
      Order.countDocuments({ orderStatus: { $in: activeOrderStatuses } }),
      Order.countDocuments({ orderStatus: "COMPLETED" }),
      Order.countDocuments({ orderStatus: "CANCELLED" }),
      Order.aggregate([
        {
          $group: {
            _id: "$orderStatus",
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            status: "$_id",
            count: 1,
          },
        },
        { $sort: { status: 1 } },
      ]),
      Order.aggregate([
        { $match: revenueOrderFilter },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.menuItemId",
            quantitySold: { $sum: { $ifNull: ["$items.quantity", 0] } },
            revenue: {
              $sum: {
                $multiply: [
                  { $ifNull: ["$items.quantity", 0] },
                  { $ifNull: ["$items.price", 0] },
                ],
              },
            },
          },
        },
        { $sort: { quantitySold: -1, revenue: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: Menu.collection.name,
            localField: "_id",
            foreignField: "_id",
            as: "menuItem",
          },
        },
        {
          $unwind: {
            path: "$menuItem",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            name: { $ifNull: ["$menuItem.name", "Deleted item"] },
            category: "$menuItem.category",
            quantitySold: 1,
            revenue: 1,
          },
        },
      ]),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select(
          "customerName totalAmount orderStatus paymentStatus paymentMethod createdAt updatedAt items tableId tableNumber assignedStaff"
        )
        .populate("tableId", "tableNumber assignedStaff")
        .populate("assignedStaff", "userName email role isActive")
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalStaff,
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue: revenue[0]?.totalRevenue || 0,
        todaysRevenue: todaysRevenue[0]?.totalRevenue || 0,
        todaysOrders,
        pendingOrders,
        activeOrders,
        completedOrders,
        cancelledOrders,
        orderStatusBreakdown,
        topSellingItems,
        recentOrders,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load dashboard statistics",
    });
  }
};
