"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminDashboardController = void 0;
const user_schema_js_1 = require("../auth/user.schema.js");
const menu_schema_js_1 = require("../menu/menu.schema.js");
const order_model_js_1 = require("../orders/order.model.js");
const getAdminDashboardController = async (req, res) => {
    try {
        res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
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
        ];
        const revenueOrderFilter = {
            orderStatus: { $ne: "CANCELLED" },
        };
        const [totalStaff, totalUsers, totalProducts, totalOrders, revenue, todaysRevenue, todaysOrders, pendingOrders, activeOrders, completedOrders, cancelledOrders, orderStatusBreakdown, topSellingItems, recentOrders,] = await Promise.all([
            user_schema_js_1.User.countDocuments({ role: "admin" }),
            user_schema_js_1.User.countDocuments({ role: "user" }),
            menu_schema_js_1.Menu.countDocuments(),
            order_model_js_1.Order.countDocuments(),
            order_model_js_1.Order.aggregate([
                { $match: revenueOrderFilter },
                { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
            ]),
            order_model_js_1.Order.aggregate([
                {
                    $match: {
                        ...revenueOrderFilter,
                        createdAt: todayRange,
                    },
                },
                { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
            ]),
            order_model_js_1.Order.countDocuments({ createdAt: todayRange }),
            order_model_js_1.Order.countDocuments({ orderStatus: "PENDING" }),
            order_model_js_1.Order.countDocuments({ orderStatus: { $in: activeOrderStatuses } }),
            order_model_js_1.Order.countDocuments({ orderStatus: "COMPLETED" }),
            order_model_js_1.Order.countDocuments({ orderStatus: "CANCELLED" }),
            order_model_js_1.Order.aggregate([
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
            order_model_js_1.Order.aggregate([
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
                        from: menu_schema_js_1.Menu.collection.name,
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
            order_model_js_1.Order.find()
                .sort({ updatedAt: -1, createdAt: -1 })
                .limit(5)
                .select("customerName totalAmount orderStatus paymentStatus createdAt updatedAt items")
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to load dashboard statistics",
        });
    }
};
exports.getAdminDashboardController = getAdminDashboardController;
//# sourceMappingURL=dashboard.controller.js.map