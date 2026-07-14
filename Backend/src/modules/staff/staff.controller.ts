import { Request, Response } from "express";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt.js";
import { comparePassword } from "../../utils/password.js";
import { User } from "../auth/user.schema.js";
import { loginSchema } from "../auth/user.validation.js";
import { saveUserRefreshToken } from "../auth/auth.service.js";
import { Order } from "../orders/order.model.js";
import {
  ORDER_STATUSES,
  OrderAssignmentError,
  OrderStatus,
  OrderStatusUpdateError,
  acceptTakeawayOrderForStaff,
  isOrderStatus,
  isValidObjectId,
  updateOrderStatusWithSideEffects,
} from "../orders/order-status.service.js";
import { Table } from "../table/table.model.js";

const isProduction = process.env.NODE_ENV === "production";

const accessCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ("none" as const) : ("lax" as const),
  maxAge: Number(process.env.JWT_ACCESS_COOKIE_MS || 15 * 60 * 1000),
  path: "/",
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ("none" as const) : ("lax" as const),
  maxAge: Number(process.env.JWT_REFRESH_COOKIE_MS || 14 * 24 * 60 * 60 * 1000),
  path: "/",
};

const STAFF_ALLOWED_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
] as const satisfies readonly OrderStatus[];

const TAKEAWAY_STAFF_ALLOWED_STATUSES = [
  "PREPARING",
  "READY",
  "COMPLETED",
] as const satisfies readonly OrderStatus[];

const ACTIVE_ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "ACCEPTED",
  "PREPARING",
  "READY",
] as const satisfies readonly OrderStatus[];
const HISTORY_ORDER_STATUSES = [
  "COMPLETED",
] as const satisfies readonly OrderStatus[];

const getApiMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong";

const isStaffAllowedStatus = (
  status: OrderStatus
): status is (typeof STAFF_ALLOWED_STATUSES)[number] =>
  (STAFF_ALLOWED_STATUSES as readonly OrderStatus[]).includes(status);

const isTakeawayStaffAllowedStatus = (
  status: OrderStatus
): status is (typeof TAKEAWAY_STAFF_ALLOWED_STATUSES)[number] =>
  (TAKEAWAY_STAFF_ALLOWED_STATUSES as readonly OrderStatus[]).includes(status);

const formatStaffTable = (table: any) => ({
  _id: String(table._id),
  tableNumber: table.tableNumber,
  label: `T-${String(table.tableNumber).padStart(2, "0")}`,
  isActive: table.isActive,
  isOccupied: table.isOccupied,
  qrUrl: table.qrUrl,
  qrCode: table.qrCode,
});

const getAssignedTableIds = async (staffId: string) =>
  (await Table.find({ assignedStaff: staffId }).distinct("_id")).map((tableId) =>
    String(tableId)
  );

const getStaffOrderOwnershipFilter = (
  staffId: string,
  tableIds: string[]
): Record<string, unknown> => ({
  $or: [
    { assignedStaff: staffId },
    {
      assignedStaff: null,
      tableId: { $in: tableIds },
    },
  ],
});

const getStaffActiveOrderVisibilityFilter = (
  staffId: string,
  tableIds: string[]
): Record<string, unknown> => ({
  $or: [
    { orderType: "Takeaway" },
    ...((getStaffOrderOwnershipFilter(staffId, tableIds).$or || []) as Record<
      string,
      unknown
    >[]),
  ],
});

const getStartOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

export const getStaffProfileController = async (
  req: Request,
  res: Response
) => {
  try {
    const staff = await User.findOne({
      _id: String(req.user?._id),
      role: "staff",
      isActive: true,
    })
      .select("userName email phoneNumber profileImage role isActive createdAt updatedAt")
      .lean();

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      staff,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: getApiMessage(error),
    });
  }
};

export const staffLoginController = async (req: Request, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: validation.error.format(),
      });
    }

    const { email, password } = validation.data;
    const staff = await User.findOne({
      email: email.trim().toLowerCase(),
      role: "staff",
      isActive: true,
    }).select("+password -__v");

    if (!staff?.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid staff credentials",
      });
    }

    const isPasswordValid = await comparePassword(password, staff.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid staff credentials",
      });
    }

    const accessToken = generateAccessToken(String(staff._id), staff.role);
    const refreshToken = generateRefreshToken(String(staff._id));

    await saveUserRefreshToken(String(staff._id), refreshToken);

    res.cookie("accessToken", accessToken, accessCookieOptions);
    res.cookie("refreshToken", refreshToken, refreshCookieOptions);

    return res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: staff._id,
        userName: staff.userName,
        email: staff.email,
        role: staff.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: getApiMessage(error),
    });
  }
};

export const getStaffDashboardController = async (
  req: Request,
  res: Response
) => {
  try {
    const staffId = String(req.user?._id);
    const tables = await Table.find({ assignedStaff: staffId })
      .sort({ tableNumber: 1 })
      .lean();
    const tableIds = tables.map((table) => String(table._id));
    const ownershipFilter = getStaffOrderOwnershipFilter(staffId, tableIds);
    const activeVisibilityFilter = getStaffActiveOrderVisibilityFilter(
      staffId,
      tableIds
    );
    const activeOrdersFilter: Record<string, unknown> = {
      ...activeVisibilityFilter,
      orderStatus: { $in: ACTIVE_ORDER_STATUSES },
    };
    const completedOrdersFilter: Record<string, unknown> = {
      ...ownershipFilter,
      orderStatus: "COMPLETED",
    };
    const readyOrdersFilter: Record<string, unknown> = {
      ...activeVisibilityFilter,
      orderStatus: "READY",
    };
    const servedTodayFilter: Record<string, unknown> = {
      ...completedOrdersFilter,
      updatedAt: { $gte: getStartOfToday() },
    };

    const [activeOrders, completedOrders, readyOrders, servedToday, recentOrders] =
      await Promise.all([
        Order.countDocuments(activeOrdersFilter),
        Order.countDocuments(completedOrdersFilter),
        Order.countDocuments(readyOrdersFilter),
        Order.countDocuments(servedTodayFilter),
        Order.find(activeOrdersFilter)
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("items.menuItemId", "name category image price")
          .populate("tableId", "tableNumber isActive isOccupied")
          .populate("assignedStaff", "userName email role isActive")
          .populate("userId", "userName email")
          .lean(),
      ]);

    return res.status(200).json({
      success: true,
      summary: {
        assignedTables: tables.length,
        occupiedTables: tables.filter((table) => table.isOccupied).length,
        activeOrders,
        completedOrders,
        readyOrders,
        servedToday,
      },
      tables: tables.map(formatStaffTable),
      recentOrders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: getApiMessage(error),
    });
  }
};

export const getStaffAssignedTablesController = async (
  req: Request,
  res: Response
) => {
  try {
    const tables = await Table.find({ assignedStaff: String(req.user?._id) })
      .sort({ tableNumber: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      tables: tables.map(formatStaffTable),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: getApiMessage(error),
    });
  }
};

export const getStaffOrdersController = async (req: Request, res: Response) => {
  try {
    const staffId = String(req.user?._id);
    const tableIds = await getAssignedTableIds(staffId);
    const scope = typeof req.query.scope === "string" ? req.query.scope : "active";
    const ownershipFilter = getStaffOrderOwnershipFilter(staffId, tableIds);
    const activeVisibilityFilter = getStaffActiveOrderVisibilityFilter(
      staffId,
      tableIds
    );
    const ownershipClauses = (ownershipFilter.$or || []) as Record<
      string,
      unknown
    >[];
    const allVisibilityFilter: Record<string, unknown> = {
      $or: [
        {
          orderType: "Takeaway",
          orderStatus: { $in: ACTIVE_ORDER_STATUSES },
        },
        ...ownershipClauses,
      ],
    };
    const andFilters: Record<string, unknown>[] = [];

    if (scope === "active") {
      andFilters.push(activeVisibilityFilter);
      andFilters.push({ orderStatus: { $in: ACTIVE_ORDER_STATUSES } });
    } else if (scope === "history") {
      andFilters.push(ownershipFilter);
      andFilters.push({ orderStatus: { $in: HISTORY_ORDER_STATUSES } });
    } else if (scope === "all") {
      andFilters.push(allVisibilityFilter);
    } else if (scope !== "all") {
      return res.status(400).json({
        success: false,
        message: "Invalid order scope",
      });
    }

    if (typeof req.query.status === "string" && req.query.status !== "all") {
      if (!isOrderStatus(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order status",
        });
      }

      andFilters.push({ orderStatus: req.query.status });
    }

    if (typeof req.query.search === "string" && req.query.search.trim()) {
      const term = req.query.search.trim();
      andFilters.push({
        $or: [
          { customerName: { $regex: term, $options: "i" } },
          { customerPhone: { $regex: term, $options: "i" } },
        ],
      });
    }

    const filters =
      andFilters.length === 1 ? andFilters[0] : { $and: andFilters };

    const orders = await Order.find(filters)
      .sort({ createdAt: -1 })
      .populate("items.menuItemId", "name category image price")
      .populate("tableId", "tableNumber isActive isOccupied")
      .populate("assignedStaff", "userName email role isActive")
      .populate("userId", "userName email")
      .lean();

    return res.status(200).json({
      success: true,
      orders,
      statuses: ORDER_STATUSES,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: getApiMessage(error),
    });
  }
};

export const acceptTakeawayOrderController = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    res.set("Cache-Control", "no-store");

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const order = await acceptTakeawayOrderForStaff(
      req.params.id,
      String(req.user?._id)
    );

    return res.status(200).json({
      success: true,
      order,
      message: "Order accepted",
    });
  } catch (error) {
    if (error instanceof OrderAssignmentError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: getApiMessage(error),
    });
  }
};

export const updateStaffOrderStatusController = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    res.set("Cache-Control", "no-store");

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const nextStatus = req.body.orderStatus ?? req.body.status;

    if (
      !isOrderStatus(nextStatus) ||
      !isStaffAllowedStatus(nextStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff order status",
      });
    }

    const order = await Order.findById(req.params.id)
      .select("tableId assignedStaff orderStatus orderType")
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.orderStatus === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Cancelled orders cannot be updated by staff",
      });
    }

    if (order.orderStatus === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "Served orders cannot be updated by staff",
      });
    }

    const staffId = String(req.user?._id);
    const assignedStaffId = order.assignedStaff
      ? String(order.assignedStaff)
      : "";

    if (order.orderType === "Takeaway") {
      if (!assignedStaffId) {
        return res.status(403).json({
          success: false,
          message: "Accept this order before updating its status",
        });
      }

      if (assignedStaffId !== staffId) {
        return res.status(403).json({
          success: false,
          message: "Only the assigned staff member can update this order",
        });
      }

      if (!isTakeawayStaffAllowedStatus(nextStatus)) {
        return res.status(400).json({
          success: false,
          message:
            "Takeaway orders can only be updated to Preparing, Ready, or Completed",
        });
      }
    } else {
      if (!order.tableId) {
        return res.status(403).json({
          success: false,
          message: "This order is not assigned to your tables",
        });
      }

      const ownsAssignedOrder = assignedStaffId === staffId;
      const ownsTable =
        !assignedStaffId &&
        (await Table.exists({
          _id: order.tableId,
          assignedStaff: staffId,
        }));

      if (!ownsAssignedOrder && !ownsTable) {
        return res.status(403).json({
          success: false,
          message: "This order is not assigned to your tables",
        });
      }
    }

    const { order: updatedOrder, foodReadySms } =
      await updateOrderStatusWithSideEffects(req.params.id, nextStatus);

    return res.status(200).json({
      success: true,
      order: updatedOrder,
      foodReadySms,
      message:
        foodReadySms?.status === "failed"
          ? "Order status updated, but food ready SMS failed"
          : "Order status updated",
    });
  } catch (error) {
    if (error instanceof OrderStatusUpdateError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: getApiMessage(error),
    });
  }
};
